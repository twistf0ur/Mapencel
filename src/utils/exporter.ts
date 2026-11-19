import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import JSZip from 'jszip';
import { AnimationProject } from '../types/animation';
import { renderFrameComposite } from './drawing';
import { downloadBlob } from './storage';

export type VideoContainerPreference = 'auto' | 'mp4' | 'webm';

export interface VideoExportOptions {
  scale?: number;
  container?: VideoContainerPreference;
  repeatCount?: number;
  videoBitsPerSecond?: number;
  includeAudio?: boolean;
  onProgress?: (pct: number, phase: 'rendering' | 'recording') => void;
}

export interface VideoExportResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
  width: number;
  height: number;
  durationSec: number;
}

const MP4_VIDEO_ONLY = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=avc1.4D401E',
  'video/mp4;codecs=avc1',
  'video/mp4',
];

const MP4_WITH_AUDIO = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
];

const WEBM_VIDEO_ONLY = [
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm',
];

const WEBM_WITH_AUDIO = [
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm',
];

export function detectVideoSupport(): {
  supported: boolean;
  supportsMp4: boolean;
  supportsWebm: boolean;
} {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return { supported: false, supportsMp4: false, supportsWebm: false };
  }
  const supportsMp4 = MP4_VIDEO_ONLY.some((m) => MediaRecorder.isTypeSupported(m));
  const supportsWebm = WEBM_VIDEO_ONLY.some((m) => MediaRecorder.isTypeSupported(m));
  return {
    supported: supportsMp4 || supportsWebm,
    supportsMp4,
    supportsWebm,
  };
}

interface CodecCandidate {
  mimeType: string;
  extension: 'mp4' | 'webm';
}

function buildCodecAttempts(
  preference: VideoContainerPreference,
  hasAudio: boolean
): CodecCandidate[] {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video recording is not supported in this browser.');
  }

  const mp4List = (hasAudio ? MP4_WITH_AUDIO : MP4_VIDEO_ONLY)
    .filter((m) => MediaRecorder.isTypeSupported(m))
    .map((mimeType): CodecCandidate => ({ mimeType, extension: 'mp4' }));

  const webmList = (hasAudio ? WEBM_WITH_AUDIO : WEBM_VIDEO_ONLY)
    .filter((m) => MediaRecorder.isTypeSupported(m))
    .map((mimeType): CodecCandidate => ({ mimeType, extension: 'webm' }));

  if (preference === 'mp4') {
    if (mp4List.length === 0) {
      throw new Error('MP4 recording is not supported in this browser. Select WebM or Auto.');
    }
    return mp4List;
  }

  if (preference === 'webm') {
    if (webmList.length === 0) {
      return [{ mimeType: '', extension: 'webm' }];
    }
    return webmList;
  }

  // Auto: try MP4 candidates first if supported, then always keep WebM candidates as verified fallback
  const combined = [...mp4List, ...webmList];
  if (combined.length === 0) {
    combined.push({ mimeType: '', extension: 'webm' });
  }
  return combined;
}

export function getSupportedVideoMimeType(
  preference: VideoContainerPreference = 'auto',
  hasAudio = false
): {
  mimeType: string;
  extension: 'mp4' | 'webm';
} {
  const list = buildCodecAttempts(preference, hasAudio);
  return list[0];
}

function expandHoldFrames(project: AnimationProject) {
  const list: AnimationProject['frames'] = [];
  for (const frame of project.frames) {
    const hold = Math.max(1, frame.hold || 1);
    for (let h = 0; h < hold; h++) {
      list.push(frame);
    }
  }
  return list;
}

async function verifyVideoPlayable(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 64 || typeof document === 'undefined') return false;
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onError);
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(ok);
    };

    const onReady = () => {
      finish(video.videoWidth > 0 && video.videoHeight > 0);
    };
    const onError = () => finish(false);

    const timeoutId = window.setTimeout(() => {
      finish(video.readyState >= 2 && video.videoWidth > 0);
    }, 2500);

    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('error', onError);
    video.src = url;
    video.load();
  });
}

async function recordSingleAttempt(params: {
  sequence: AnimationProject['frames'];
  uniqueRendered: Map<string, HTMLCanvasElement>;
  outW: number;
  outH: number;
  fps: number;
  frameDurationMs: number;
  totalDurationMs: number;
  repeatCount: number;
  candidate: CodecCandidate;
  videoBitsPerSecond: number;
  decodedAudio: { buffer: AudioBuffer; volume: number } | null;
  onProgress?: (pct: number) => void;
}): Promise<Blob> {
  const {
    sequence,
    uniqueRendered,
    outW,
    outH,
    fps,
    frameDurationMs,
    totalDurationMs,
    repeatCount,
    candidate,
    videoBitsPerSecond,
    decodedAudio,
    onProgress,
  } = params;

  const recordCanvas = document.createElement('canvas');
  recordCanvas.width = outW;
  recordCanvas.height = outH;
  // Mount invisibly in DOM so Chromium's compositor reliably pushes canvas stream frames
  recordCanvas.style.position = 'fixed';
  recordCanvas.style.left = '-99999px';
  recordCanvas.style.top = '0';
  recordCanvas.style.width = '2px';
  recordCanvas.style.height = '2px';
  recordCanvas.style.opacity = '0.001';
  recordCanvas.style.pointerEvents = 'none';
  document.body.appendChild(recordCanvas);

  const rctx = recordCanvas.getContext('2d')!;
  const firstRendered = uniqueRendered.get(sequence[0].id);
  if (firstRendered) {
    rctx.drawImage(firstRendered, 0, 0);
  }

  if (typeof recordCanvas.captureStream !== 'function') {
    recordCanvas.remove();
    throw new Error('Canvas stream capture is not supported in this browser.');
  }

  const canvasStream = recordCanvas.captureStream(fps);
  const videoTracks = canvasStream.getVideoTracks();
  const videoTrack = videoTracks[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;
  const combinedStream = new MediaStream(videoTracks);

  let tempAudioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;

  if (decodedAudio) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      tempAudioCtx = new Ctx();
      if (tempAudioCtx.state === 'suspended') {
        await tempAudioCtx.resume();
      }
      const dest = tempAudioCtx.createMediaStreamDestination();
      const src = tempAudioCtx.createBufferSource();
      src.buffer = decodedAudio.buffer;
      src.loop = repeatCount > 1;
      const gain = tempAudioCtx.createGain();
      gain.gain.value = decodedAudio.volume;
      src.connect(gain);
      gain.connect(dest);
      audioSource = src;

      for (const track of dest.stream.getAudioTracks()) {
        combinedStream.addTrack(track);
      }
    } catch {
      if (tempAudioCtx) {
        await tempAudioCtx.close().catch(() => undefined);
        tempAudioCtx = null;
      }
      audioSource = null;
    }
  }

  const recorderOptions: MediaRecorderOptions = candidate.mimeType
    ? { mimeType: candidate.mimeType, videoBitsPerSecond }
    : { videoBitsPerSecond };
  const recorder = new MediaRecorder(combinedStream, recorderOptions);

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  try {
    return await new Promise<Blob>((resolve, reject) => {
      let timerId = 0;
      let stopped = false;

      recorder.onerror = () => {
        window.clearTimeout(timerId);
        reject(new Error('MediaRecorder encountered an encoding error.'));
      };

      recorder.onstop = () => {
        window.clearTimeout(timerId);
        const finalType =
          recorder.mimeType || candidate.mimeType || `video/${candidate.extension}`;
        resolve(new Blob(chunks, { type: finalType }));
      };

      // Start WITHOUT a tiny timeslice so MediaRecorder writes one complete, valid container header
      recorder.start();
      if (audioSource) {
        audioSource.start(0);
      }

      const startTime = performance.now();
      // Pump frames consistently at <= 66ms (~15+ ticks/sec minimum) even for 1-frame or low-FPS clips
      const pumpIntervalMs = Math.max(16, Math.min(Math.round(frameDurationMs), 66));

      const paintAt = (elapsedMs: number) => {
        const frameIdx = Math.min(
          sequence.length - 1,
          Math.floor(elapsedMs / frameDurationMs) % sequence.length
        );
        const rendered = uniqueRendered.get(sequence[frameIdx].id);
        if (rendered) {
          rctx.drawImage(rendered, 0, 0);
        }
        try {
          videoTrack?.requestFrame?.();
        } catch {
          // Ignore if requestFrame is unavailable
        }
      };

      // Paint initial frame cleanly right after recorder starts
      paintAt(0);

      const tick = () => {
        if (stopped) return;
        const elapsed = performance.now() - startTime;
        paintAt(elapsed);
        const pct = Math.min(99, Math.round((elapsed / totalDurationMs) * 100));
        onProgress?.(pct);

        if (elapsed >= totalDurationMs) {
          stopped = true;
          onProgress?.(100);
          timerId = window.setTimeout(() => {
            try {
              audioSource?.stop();
            } catch {
              // ignore
            }
            if (recorder.state !== 'inactive') {
              recorder.stop();
            }
          }, 60);
          return;
        }

        const nextWait = Math.min(pumpIntervalMs, Math.max(16, totalDurationMs - elapsed));
        timerId = window.setTimeout(tick, nextWait);
      };

      timerId = window.setTimeout(tick, pumpIntervalMs);
    });
  } finally {
    for (const track of combinedStream.getTracks()) {
      track.stop();
    }
    for (const track of canvasStream.getTracks()) {
      track.stop();
    }
    if (tempAudioCtx) {
      await tempAudioCtx.close().catch(() => undefined);
    }
    recordCanvas.remove();
  }
}

export async function exportVideo(
  project: AnimationProject,
  options: VideoExportOptions = {}
): Promise<VideoExportResult> {
  const {
    scale = 1,
    container = 'auto',
    repeatCount = 1,
    videoBitsPerSecond = 8_000_000,
    includeAudio = true,
    onProgress,
  } = options;

  // Video codecs (especially H.264/MP4) require even dimensions
  const rawW = Math.max(32, Math.round(project.width * scale));
  const rawH = Math.max(32, Math.round(project.height * scale));
  const outW = rawW % 2 === 0 ? rawW : rawW + 1;
  const outH = rawH % 2 === 0 ? rawH : rawH + 1;

  const videoBg = project.backgroundColor === 'transparent' ? '#FFFFFF' : project.backgroundColor;

  // Phase 1: Pre-render each unique frame once onto offscreen canvases
  const uniqueRendered = new Map<string, HTMLCanvasElement>();
  const compCanvas = document.createElement('canvas');

  for (let i = 0; i < project.frames.length; i++) {
    const frame = project.frames[i];
    await renderFrameComposite(
      frame,
      project.layers,
      project.width,
      project.height,
      videoBg,
      compCanvas,
      true
    );
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = outW;
    frameCanvas.height = outH;
    const fctx = frameCanvas.getContext('2d')!;
    fctx.fillStyle = videoBg;
    fctx.fillRect(0, 0, outW, outH);
    fctx.drawImage(compCanvas, 0, 0, outW, outH);
    uniqueRendered.set(frame.id, frameCanvas);

    onProgress?.(Math.round(((i + 1) / project.frames.length) * 35), 'rendering');
  }

  // Decode project audio once upfront if enabled
  let decodedAudio: { buffer: AudioBuffer; volume: number } | null = null;
  if (includeAudio && project.audio?.dataUrl && !project.audio.muted) {
    let probeCtx: AudioContext | null = null;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      probeCtx = new Ctx();
      const res = await fetch(project.audio.dataUrl);
      const arr = await res.arrayBuffer();
      const buffer = await probeCtx.decodeAudioData(arr.slice(0));
      decodedAudio = { buffer, volume: project.audio.volume };
    } catch {
      decodedAudio = null;
    } finally {
      if (probeCtx) {
        await probeCtx.close().catch(() => undefined);
      }
    }
  }

  // Build expanded playback timeline sequence
  const baseSequence = expandHoldFrames(project);
  const repeats = Math.max(1, Math.round(repeatCount));
  const sequence: AnimationProject['frames'] = [];
  for (let r = 0; r < repeats; r++) {
    sequence.push(...baseSequence);
  }

  const fps = Math.max(1, Math.min(30, project.fps));
  const frameDurationMs = 1000 / fps;
  // Minimum 1000ms duration guarantees >= 15 encoded frames even for 1-frame animations
  const totalDurationMs = Math.max(1000, sequence.length * frameDurationMs);

  const candidates = buildCodecAttempts(container, Boolean(decodedAudio));
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const blob = await recordSingleAttempt({
        sequence,
        uniqueRendered,
        outW,
        outH,
        fps,
        frameDurationMs,
        totalDurationMs,
        repeatCount: repeats,
        candidate,
        videoBitsPerSecond,
        decodedAudio,
        onProgress: (pct) => onProgress?.(35 + Math.round(pct * 0.65), 'recording'),
      });

      const playable = await verifyVideoPlayable(blob);
      if (playable) {
        return {
          blob,
          mimeType: blob.type || candidate.mimeType || `video/${candidate.extension}`,
          extension: candidate.extension,
          width: outW,
          height: outH,
          durationSec: +(totalDurationMs / 1000).toFixed(2),
        };
      }
      lastError = new Error(
        `Encoded ${candidate.extension.toUpperCase()} stream could not be decoded by the browser.`
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Video recording failed.');
    }
  }

  throw lastError || new Error('Failed to create a playable video in this browser.');
}

export async function exportAnimatedGif(
  project: AnimationProject,
  scale = 1,
  transparentBg = false,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const outW = Math.max(32, Math.round(project.width * scale));
  const outH = Math.max(32, Math.round(project.height * scale));
  const frames = expandHoldFrames(project);
  const delayMs = Math.max(20, Math.round(1000 / project.fps));

  const compCanvas = document.createElement('canvas');
  const scaleCanvas = document.createElement('canvas');
  scaleCanvas.width = outW;
  scaleCanvas.height = outH;
  const sctx = scaleCanvas.getContext('2d', { willReadFrequently: true })!;

  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    await renderFrameComposite(
      frames[i],
      project.layers,
      project.width,
      project.height,
      transparentBg ? 'transparent' : project.backgroundColor,
      compCanvas,
      !transparentBg
    );

    sctx.clearRect(0, 0, outW, outH);
    if (!transparentBg && project.backgroundColor === 'transparent') {
      sctx.fillStyle = '#FFFFFF';
      sctx.fillRect(0, 0, outW, outH);
    }
    sctx.drawImage(compCanvas, 0, 0, outW, outH);

    const imgData = sctx.getImageData(0, 0, outW, outH);
    const palette = quantize(imgData.data, 256, {
      format: transparentBg ? 'rgba4444' : 'rgb565',
      oneBitAlpha: transparentBg,
    });
    const index = applyPalette(imgData.data, palette, transparentBg ? 'rgba4444' : 'rgb565');

    let transparentIndex = -1;
    if (transparentBg) {
      transparentIndex = palette.findIndex((c) => c[3] === 0);
    }

    gif.writeFrame(index, outW, outH, {
      palette,
      delay: delayMs,
      repeat: 0,
      transparent: transparentBg && transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
      dispose: transparentBg ? 2 : 1,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / frames.length) * 100));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' });
}

export async function exportSpriteSheet(
  project: AnimationProject,
  columns: number,
  scale = 1,
  transparentBg = true,
  includeJsonAtlas = true
): Promise<{ pngBlob: Blob; jsonBlob?: Blob }> {
  const frames = project.frames;
  const cellW = Math.max(16, Math.round(project.width * scale));
  const cellH = Math.max(16, Math.round(project.height * scale));
  const cols = Math.max(1, Math.min(columns, frames.length));
  const rows = Math.ceil(frames.length / cols);

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = cols * cellW;
  sheetCanvas.height = rows * cellH;
  const ctx = sheetCanvas.getContext('2d')!;

  if (!transparentBg && project.backgroundColor !== 'transparent') {
    ctx.fillStyle = project.backgroundColor;
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
  }

  const compCanvas = document.createElement('canvas');
  const atlasFrames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number }; duration: number }
  > = {};

  for (let i = 0; i < frames.length; i++) {
    await renderFrameComposite(
      frames[i],
      project.layers,
      project.width,
      project.height,
      transparentBg ? 'transparent' : project.backgroundColor,
      compCanvas,
      !transparentBg
    );
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellW;
    const y = row * cellH;
    ctx.drawImage(compCanvas, x, y, cellW, cellH);

    atlasFrames[`frame_${String(i + 1).padStart(3, '0')}`] = {
      frame: { x, y, w: cellW, h: cellH },
      duration: Math.round((1000 / project.fps) * (frames[i].hold || 1)),
    };
  }

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    sheetCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode sprite sheet'))), 'image/png');
  });

  if (!includeJsonAtlas) {
    return { pngBlob };
  }

  const atlas = {
    meta: {
      app: 'CelDraft',
      project: project.name,
      size: { w: sheetCanvas.width, h: sheetCanvas.height },
      frameSize: { w: cellW, h: cellH },
      fps: project.fps,
      frameCount: frames.length,
    },
    frames: atlasFrames,
  };
  const jsonBlob = new Blob([JSON.stringify(atlas, null, 2)], { type: 'application/json' });
  return { pngBlob, jsonBlob };
}

export async function exportPngSequenceZip(
  project: AnimationProject,
  scale = 1,
  transparentBg = false,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const outW = Math.max(16, Math.round(project.width * scale));
  const outH = Math.max(16, Math.round(project.height * scale));
  const compCanvas = document.createElement('canvas');
  const scaleCanvas = document.createElement('canvas');
  scaleCanvas.width = outW;
  scaleCanvas.height = outH;
  const sctx = scaleCanvas.getContext('2d')!;

  for (let i = 0; i < project.frames.length; i++) {
    await renderFrameComposite(
      project.frames[i],
      project.layers,
      project.width,
      project.height,
      transparentBg ? 'transparent' : project.backgroundColor,
      compCanvas,
      !transparentBg
    );
    sctx.clearRect(0, 0, outW, outH);
    sctx.drawImage(compCanvas, 0, 0, outW, outH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      scaleCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png');
    });
    const filename = `frame_${String(i + 1).padStart(3, '0')}.png`;
    zip.file(filename, blob);
    if (onProgress) {
      onProgress(Math.round(((i + 1) / project.frames.length) * 100));
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function exportCurrentFramePng(
  project: AnimationProject,
  frameIndex: number,
  transparentBg = false
): Promise<void> {
  const frame = project.frames[frameIndex];
  if (!frame) return;
  const compCanvas = document.createElement('canvas');
  await renderFrameComposite(
    frame,
    project.layers,
    project.width,
    project.height,
    transparentBg ? 'transparent' : project.backgroundColor,
    compCanvas,
    !transparentBg
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    compCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png');
  });
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'animation';
  downloadBlob(blob, `${slug}-frame-${String(frameIndex + 1).padStart(3, '0')}.png`);
}

export function exportProjectJson(project: AnimationProject): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project';
  downloadBlob(blob, `${slug}.celdraft.json`);
}
