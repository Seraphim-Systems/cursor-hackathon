/** Maps model sentiment (-1 … 1) to a 1–10 intensity scale (1 = low, 10 = high). */

const LABELS = [
  "Heavy",
  "Somber",
  "Low",
  "Pensive",
  "Quiet",
  "Steady",
  "Warm",
  "Hopeful",
  "Bright",
  "Radiant",
] as const;

export type EmotionRatingDisplay = {
  /** Short emotion name for this band */
  label: (typeof LABELS)[number];
  /** 1–10 intensity */
  value: number;
};

export function emotionRatingFromSentiment(sentimentScore: number | null | undefined): EmotionRatingDisplay | null {
  if (sentimentScore === null || sentimentScore === undefined || Number.isNaN(sentimentScore)) {
    return null;
  }
  const clamped = Math.max(-1, Math.min(1, sentimentScore));
  const value = Math.round(1 + ((clamped + 1) / 2) * 9);
  const v = Math.max(1, Math.min(10, value));
  return { label: LABELS[v - 1], value: v };
}

/** 0–100 for positioning a marker (1 → 0, 10 → 100). */
export function emotionMarkerPercent(value: number): number {
  return ((Math.max(1, Math.min(10, value)) - 1) / 9) * 100;
}
