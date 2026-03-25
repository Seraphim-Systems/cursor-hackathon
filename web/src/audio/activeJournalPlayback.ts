/** Ensures only one journal entry audio plays at a time (no overlapping playback). */

let current: HTMLAudioElement | null = null;

export function claimJournalPlayback(el: HTMLAudioElement): void {
  if (current && current !== el) {
    current.pause();
  }
  current = el;
}

export function releaseJournalPlayback(el: HTMLAudioElement): void {
  if (current === el) {
    current = null;
  }
}
