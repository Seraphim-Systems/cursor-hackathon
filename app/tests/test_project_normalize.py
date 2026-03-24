"""Domain: normalized project names for deduplication (see contracts / journal facade)."""

from app.domain.project_normalize import normalized_project_name


def test_equivalent_titles_share_normalized_key() -> None:
    assert normalized_project_name("My Project") == normalized_project_name("my  project")


def test_punctuation_and_spacing_normalize_consistently() -> None:
    assert normalized_project_name("Foo — Bar!") == normalized_project_name("foo-bar")


def test_empty_falls_back_to_untitled() -> None:
    assert normalized_project_name("@@@") == "untitled"
