"""Static checks on the installers that would otherwise only fail on the owner's machine.

Regression (found 2026-11-12): an edit spliced labels into the middle of the
Windows installer's Docker block and dropped `:check_wsl`, so `call :check_wsl`
and `goto :fail_wsl_declined` pointed nowhere and the Docker download branch
fell through into error messages. No Windows machine runs here, so the label
structure is checked as text.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BAT = ROOT / "Install Football Memories.bat"
COMMAND = ROOT / "Install Football Memories.command"
ADOPT = "backend/app/connectors/git_adopt.py"


def _bat_lines() -> list[str]:
    return BAT.read_text().splitlines()


def test_every_bat_jump_has_exactly_one_label() -> None:
    lines = _bat_lines()
    labels = Counter(
        line.strip()[1:].lower() for line in lines if re.match(r"^\s*:[A-Za-z_]", line)
    )
    targets = {
        match.lower()
        for line in lines
        if not line.strip().lower().startswith("rem")
        for match in re.findall(r"(?:goto|call)\s+:([A-Za-z_]\w*)", line, flags=re.I)
    } - {"eof"}

    assert not [name for name, count in labels.items() if count > 1], labels
    assert targets <= set(labels), targets - set(labels)


def test_bat_labels_are_not_inside_a_parenthesised_block() -> None:
    depth = 0
    for number, line in enumerate(_bat_lines(), 1):
        text = line.strip()
        if text.lower().startswith("rem") or not text:
            continue
        if text.startswith(":"):
            assert depth == 0, f"label on line {number} is inside a ( ) block"
            continue
        # Parentheses inside quotes are text, not blocks.
        bare = re.sub(r'"[^"]*"', "", text)
        depth += bare.count("(") - bare.count(")")
    assert depth == 0


def test_both_installers_link_a_zip_copy_to_github() -> None:
    assert ADOPT in COMMAND.read_text()
    assert ADOPT.replace("/", "\\") in BAT.read_text()


def test_both_installers_restart_themselves_after_updating() -> None:
    # A running .bat is read from disk line by line: if git replaces it, cmd
    # would carry on at the old byte offset in the new file.
    assert "FM_INSTALLER_RESTARTED" in COMMAND.read_text()
    assert "FM_INSTALLER_RESTARTED" in BAT.read_text()
