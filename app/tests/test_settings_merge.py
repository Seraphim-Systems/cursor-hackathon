"""Pure tests for settings merge (P1.5 contract)."""

from app.schemas.user_settings import UserSettings, UserSettingsPatch, merge_user_settings


def test_merge_user_settings_partial_updates() -> None:
    base = UserSettings()
    patch = UserSettingsPatch(timezone="Europe/Berlin", theme="dark")
    merged = merge_user_settings(base, patch)
    assert merged.timezone == "Europe/Berlin"
    assert merged.theme == "dark"
    assert merged.week_starts_on == "monday"


def test_merge_user_settings_empty_patch_noop() -> None:
    base = UserSettings(timezone="America/New_York")
    merged = merge_user_settings(base, UserSettingsPatch())
    assert merged.model_dump() == base.model_dump()
