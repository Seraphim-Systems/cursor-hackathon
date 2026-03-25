/** Shapes aligned with contracts/journal-entry.schema.json, insights.schema.json, entry-list, calendar-response. */

export type SourceKind = "text" | "audio" | "mixed";

export interface ProjectInsightItem {
  name: string;
  notes: string;
}

export interface Insights {
  key_points: string[];
  projects: ProjectInsightItem[];
  goals: string[];
  blockers: string[];
  people: string[];
  priorities: string[];
  themes: string[];
}

export interface JournalEntry {
  id: string;
  user_id: string;
  source: SourceKind;
  created_at: string;
  updated_at: string;
  audio_storage_key: string | null;
  transcript: string | null;
  cleaned_text: string | null;
  summary: string | null;
  sentiment_score: number | null;
  insights: Insights;
  insights_field_locks: string[];
}

export interface EntryListResponse {
  items: JournalEntry[];
  total?: number | null;
}

export interface CalendarDay {
  date: string;
  entry_ids: string[];
  count: number;
}

export interface CalendarResponse {
  days: CalendarDay[];
}

export interface PeriodSummary {
  summary: string;
  top_themes: string[];
  significant_people: string[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: { id: string; email: string; is_admin?: boolean };
}
