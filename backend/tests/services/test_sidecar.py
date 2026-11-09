"""Tag sidecar CSV parsing (HUDL_INTEGRATION.md, "Tag sidecar format")."""

from pathlib import Path

import pytest

from app.services.sidecar import SidecarError, parse_sidecar


def _write(tmp_path: Path, text: str) -> Path:
    p = tmp_path / "m.tags.csv"
    p.write_text(text, encoding="utf-8")
    return p


def test_parses_the_three_time_formats_to_seconds(tmp_path: Path) -> None:
    rows = parse_sidecar(_write(tmp_path, "time,category\n15:32,Save\n01:02:03,Goal\n932.5,Pass\n"))
    assert [r.time_s for r in rows] == [932.0, 3723.0, 932.5]


def test_keeps_the_category_name_exactly_as_written(tmp_path: Path) -> None:
    rows = parse_sidecar(_write(tmp_path, "time,category\n1:00,GK Distribution (long)\n"))
    assert rows[0].category == "GK Distribution (long)"


def test_splits_players_on_semicolons_and_trims_them(tmp_path: Path) -> None:
    rows = parse_sidecar(
        _write(tmp_path, "time,category,players\n1:00,Save, Sam Moore ; Alex Smith \n")
    )
    assert rows[0].players == ("Sam Moore", "Alex Smith")


def test_optional_columns_default_when_absent(tmp_path: Path) -> None:
    row = parse_sidecar(_write(tmp_path, "time,category\n1:00,Save\n"))[0]
    assert (row.players, row.duration_s, row.note) == ((), 0.0, "")


def test_a_bad_time_names_the_line(tmp_path: Path) -> None:
    with pytest.raises(SidecarError, match="line 3"):
        parse_sidecar(_write(tmp_path, "time,category\n1:00,Save\nsoon,Goal\n"))


def test_a_missing_required_column_is_an_error(tmp_path: Path) -> None:
    with pytest.raises(SidecarError, match="category"):
        parse_sidecar(_write(tmp_path, "time,players\n1:00,Sam\n"))


def test_an_empty_category_is_an_error(tmp_path: Path) -> None:
    with pytest.raises(SidecarError, match="line 2"):
        parse_sidecar(_write(tmp_path, "time,category\n1:00,  \n"))
