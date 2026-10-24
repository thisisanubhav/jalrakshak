// Canonical mono PCM16 WAV keeps the local speech service independent of browser codecs.
export function pcmWav(samples: Float32Array): Blob {
  if (!samples.length || samples.length > 960_000) throw new Error('AI_INVALID_AUDIO');
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => { const x = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + 2 * i, x * (x < 0 ? 32768 : 32767), true); });
  return new Blob([buffer], { type: 'audio/wav' });
}
export async function recordingWav(recording: Blob) {
  if (!recording.size || recording.size > 5_000_000) throw new Error('AI_INVALID_AUDIO');
  const decoder = new AudioContext();
  try {
    const decoded = await decoder.decodeAudioData(await recording.arrayBuffer());
    if (decoded.duration > 61 || decoded.duration < .3) throw new Error('AI_INVALID_AUDIO');
    const output = new OfflineAudioContext(1, Math.min(960_000, Math.floor(decoded.duration * 16000)), 16000);
    const source = output.createBufferSource(); source.buffer = decoded; source.connect(output.destination); source.start();
    const rendered = await output.startRendering();
    return pcmWav(rendered.getChannelData(0));
  } finally { await decoder.close(); }
}
export async function audioBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let value = '';
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
