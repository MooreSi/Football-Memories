"""Put a finished file under its final name without ever replacing an existing file.

Hard links are the exclusive publish: the name is taken atomically or not at all.
Owner report 2026-11-12: a download folder on an SMB share (a TrueNAS/Proxmox NAS)
refused them with ENOTSUP, so every moment export and reel failed after encoding.
Exclusive create (O_EXCL) does work there, so on such a drive the name is claimed
with an empty placeholder and the finished file is moved onto it. Either way a file
that already has the name is never replaced (golden rule 4).
"""

from __future__ import annotations

import contextlib
import errno
import os
from pathlib import Path

# Link refusals that mean "this drive has no hard links" (SMB, exFAT, FAT), not a
# real failure such as a full disk. Anything else is raised unchanged.
_NO_LINKS = {errno.ENOTSUP, errno.EOPNOTSUPP, errno.EPERM, errno.EMLINK}


def publish_new(source: Path, target: Path) -> None:
    """Hard link ``source`` to ``target`` (``source`` is kept), or on a drive without
    hard links move it there (``source`` is gone). Raises FileExistsError if
    ``target`` exists, leaving both files as they were."""
    try:
        os.link(source, target)
        return
    except FileExistsError:
        raise
    except OSError as error:
        if error.errno not in _NO_LINKS:
            raise
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    os.close(descriptor)
    try:
        os.replace(source, target)  # replaces only the empty placeholder claimed above
    except BaseException:
        with contextlib.suppress(OSError):
            if target.stat().st_size == 0:
                target.unlink()
        raise
