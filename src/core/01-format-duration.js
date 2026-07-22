export function formatElapsedTime(ms) {
  const totalMs = Math.max(0, Math.round(Number(ms) || 0));
  if (totalMs < 1000) return `${totalMs} ms`;
  const totalSeconds = Math.round(totalMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}min ${seconds}s` : `${minutes}min`;
}
