export const formatAudioDuration = (durationInSeconds) => {
  const totalSeconds = Math.max(0, Math.round(Number(durationInSeconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const normalizeWaveformBars = (waveform = [], targetSize = 36) => {
  if (!Array.isArray(waveform) || !waveform.length) {
    return Array.from({ length: targetSize }, () => 0.2);
  }

  if (waveform.length === targetSize) {
    return waveform.map((value) => Math.max(0.08, Math.min(1, Number(value) || 0.08)));
  }

  const chunkSize = waveform.length / targetSize;
  return Array.from({ length: targetSize }, (_, index) => {
    const start = Math.floor(index * chunkSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * chunkSize));
    const chunk = waveform.slice(start, end);
    const average = chunk.reduce((sum, value) => sum + (Number(value) || 0), 0) / chunk.length;
    return Math.max(0.08, Math.min(1, average || 0.08));
  });
};
