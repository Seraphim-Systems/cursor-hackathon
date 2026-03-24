"""Project name normalization (P2.6)."""

from app.domain.project_rules import normalize_project_name


def test_normalize_collapses_whitespace_and_lowercases() -> None:
    assert normalize_project_name("  Foo   Bar  ") == "foo bar"


def test_normalize_empty() -> None:
    assert normalize_project_name("") == ""
    assert normalize_project_name("   ") == ""
