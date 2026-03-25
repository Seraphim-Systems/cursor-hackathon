/** Aligns with contracts/user-settings.schema.json */

export type WeekStartsOn = "monday" | "sunday";
export type AudioQuality = "low" | "medium" | "high";
export type Theme = "light" | "dark" | "system";

export type UserSettings = {
  timezone: string;
  week_starts_on: WeekStartsOn;
  default_audio_quality: AudioQuality;
  theme: Theme;
  notifications_enabled: boolean;
  duck_name: string;
};

export type UserSettingsPatch = Partial<UserSettings>;
