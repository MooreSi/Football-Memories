"""Guard rail: the suite must not be able to reach any real host (golden rule 2)."""

import socket

import pytest


def test_the_suite_cannot_resolve_a_remote_host() -> None:
    with pytest.raises(RuntimeError, match="network disabled in tests"):
        socket.getaddrinfo("identity.hudl.com", 443)


def test_the_suite_cannot_connect_to_a_remote_address() -> None:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        with pytest.raises(RuntimeError, match="network disabled in tests"):
            s.connect(("93.184.216.34", 443))
    finally:
        s.close()


def test_loopback_lookups_still_work_so_a_local_test_database_is_reachable() -> None:
    """Negative control: the block is selective, not a broken socket module."""
    assert socket.getaddrinfo("127.0.0.1", 5432)
