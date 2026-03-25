/**
 * Decode blob with Web Audio API to read exact duration without playing.
 * HTMLMediaElement often leaves blob WebM as Infinity until fully buffered / seeked.
 */
export async function probeBlobDurationSeconds(blob: Blob): Promise<number | null> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  try {
    const raw = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(raw.slice(0));
    const d = audioBuffer.duration;
    if (Number.isFinite(d) && d > 0 && d !== Infinity) return d;
    return null;
  } catch {
    return null;
  } finally {
    void ctx.close();
  }
}
