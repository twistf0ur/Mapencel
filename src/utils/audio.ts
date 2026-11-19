import { AudioTrackData, VisemeType } from '../types/animation';

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => undefined);
  }
  return sharedAudioCtx;
}

export function computeWaveformPeaks(buffer: AudioBuffer, bucketCount = 240): number[] {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channelData.length / bucketCount));
  const peaks: number[] = [];
  let maxPeak = 0.001;

  for (let i = 0; i < bucketCount; i++) {
    const start = i * blockSize;
    const end = Math.min(channelData.length, start + blockSize);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > peak) peak = abs;
    }
    if (peak > maxPeak) maxPeak = peak;
    peaks.push(peak);
  }

  // Normalize 0..1
  return peaks.map((p) => Math.min(1, p / maxPeak));
}

export async function decodeAudioDataUrl(dataUrl: string): Promise<AudioBuffer> {
  const res = await fetch(dataUrl);
  const arrayBuffer = await res.arrayBuffer();
  const ctx = getAudioContext();
  return ctx.decodeAudioData(arrayBuffer.slice(0));
}

export async function processUploadedAudioFile(file: File): Promise<AudioTrackData> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const buffer = await decodeAudioDataUrl(dataUrl);
  const peaks = computeWaveformPeaks(buffer, 240);

  return {
    id: `aud_${Date.now()}`,
    name: file.name,
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    dataUrl,
    peaks,
    muted: false,
    volume: 0.85,
  };
}

/**
 * Analyzes an AudioBuffer frame-by-frame at the project's FPS and maps RMS energy
 * and zero-crossing rate into expressive lip-sync visemes.
 */
export function analyzeAudioToVisemes(
  buffer: AudioBuffer,
  fps: number,
  totalFrames: number
): VisemeType[] {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const samplesPerFrame = Math.max(1, Math.floor(sr / fps));
  const frameEnergies: number[] = [];
  const frameZcr: number[] = [];

  for (let f = 0; f < totalFrames; f++) {
    const start = f * samplesPerFrame;
    const end = Math.min(data.length, start + samplesPerFrame);
    if (start >= data.length) {
      frameEnergies.push(0);
      frameZcr.push(0);
      continue;
    }
    let sumSq = 0;
    let crossings = 0;
    for (let i = start; i < end; i++) {
      const s = data[i];
      sumSq += s * s;
      if (i > start && ((data[i - 1] >= 0 && s < 0) || (data[i - 1] < 0 && s >= 0))) {
        crossings++;
      }
    }
    const count = Math.max(1, end - start);
    frameEnergies.push(Math.sqrt(sumSq / count));
    frameZcr.push(crossings / count);
  }

  const maxE = Math.max(0.01, ...frameEnergies);
  return frameEnergies.map((e, idx) => {
    const norm = e / maxE;
    const zcr = frameZcr[idx];
    if (norm < 0.08) return 'X';
    if (norm < 0.22) return 'MBP';
    if (norm < 0.45) return zcr > 0.06 ? 'EI' : 'AO';
    if (norm < 0.72) return zcr > 0.05 ? 'EI' : 'AO';
    return 'AA';
  });
}

function encodeAudioBufferToWavDataUrl(buffer: AudioBuffer): Promise<string> {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const byteLength = 44 + samples.length * 2;
  const wav = new ArrayBuffer(byteLength);
  const view = new DataView(wav);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([wav], { type: 'audio/wav' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates a cheerful 1.5-second synthesized vocal/boing demo clip so users can test
 * audio scrubbing and automatic Lip Sync without needing an external audio file.
 */
export async function generateDemoVoiceTrack(): Promise<AudioTrackData> {
  const sampleRate = 22050;
  const duration = 1.5;
  const offline = new OfflineAudioContext(1, Math.floor(sampleRate * duration), sampleRate);

  const syllables = [
    { start: 0.08, dur: 0.22, f1: 260, f2: 340 },
    { start: 0.36, dur: 0.32, f1: 310, f2: 210 },
    { start: 0.78, dur: 0.18, f1: 380, f2: 460 },
    { start: 1.02, dur: 0.36, f1: 240, f2: 520 },
  ];

  for (const syl of syllables) {
    const osc = offline.createOscillator();
    const filter = offline.createBiquadFilter();
    const gain = offline.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(syl.f1, syl.start);
    osc.frequency.exponentialRampToValueAtTime(syl.f2, syl.start + syl.dur);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, syl.start);
    filter.frequency.linearRampToValueAtTime(1400, syl.start + syl.dur * 0.5);
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0.001, syl.start);
    gain.gain.linearRampToValueAtTime(0.45, syl.start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, syl.start + syl.dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(offline.destination);
    osc.start(syl.start);
    osc.stop(syl.start + syl.dur + 0.02);
  }

  const rendered = await offline.startRendering();
  const dataUrl = await encodeAudioBufferToWavDataUrl(rendered);
  const peaks = computeWaveformPeaks(rendered, 180);

  return {
    id: `aud_demo_${Date.now()}`,
    name: 'Demo_Dialogue_Bounce.wav',
    duration: rendered.duration,
    sampleRate: rendered.sampleRate,
    dataUrl,
    peaks,
    muted: false,
    volume: 0.85,
  };
}
