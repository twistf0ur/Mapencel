import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileCode2,
  FileImage,
  Film,
  Grid,
  Image as ImageIcon,
  Music,
  Video,
  X,
} from 'lucide-react';
import { AnimationProject } from '../types/animation';
import {
  VideoContainerPreference,
  detectVideoSupport,
  exportAnimatedGif,
  exportCurrentFramePng,
  exportPngSequenceZip,
  exportProjectJson,
  exportSpriteSheet,
  exportVideo,
} from '../utils/exporter';
import { downloadBlob } from '../utils/storage';

export type ExportTab = 'video' | 'gif' | 'spritesheet' | 'pngzip' | 'project';

interface ExportModalProps {
  project: AnimationProject;
  currentFrameIndex: number;
  initialTab?: ExportTab;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  currentFrameIndex,
  initialTab = 'video',
  onClose,
  onNotify,
}) => {
  const [tab, setTab] = useState<ExportTab>(initialTab);
  const [scale, setScale] = useState<number>(1);
  const [transparentBg, setTransparentBg] = useState<boolean>(
    project.backgroundColor === 'transparent'
  );
  const [columns, setColumns] = useState<number>(Math.min(5, Math.max(1, project.frames.length)));
  const [includeAtlas, setIncludeAtlas] = useState<boolean>(true);

  // Video creation options
  const videoSupport = useMemo(() => detectVideoSupport(), []);
  const [videoContainer, setVideoContainer] = useState<VideoContainerPreference>('auto');
  const [videoQualityBps, setVideoQualityBps] = useState<number>(8_000_000);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [includeAudio, setIncludeAudio] = useState<boolean>(
    Boolean(project.audio && !project.audio.muted)
  );
  const [createdVideo, setCreatedVideo] = useState<{
    url: string;
    blob: Blob;
    filename: string;
    durationSec: number;
    width: number;
    height: number;
    hasAudio: boolean;
  } | null>(null);
  const [videoPreviewError, setVideoPreviewError] = useState<string | null>(null);

  const [busy, setBusy] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>('Rendering frames...');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return () => {
      if (createdVideo?.url) {
        URL.revokeObjectURL(createdVideo.url);
      }
    };
  }, [createdVideo]);

  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'celdraft-animation';

  const totalHoldFrames = project.frames.reduce((sum, f) => sum + Math.max(1, f.hold || 1), 0);
  const baseDurationSec = totalHoldFrames / Math.max(1, project.fps);
  const videoTotalDurationSec = Math.max(1.0, baseDurationSec * repeatCount).toFixed(2);

  const handleExport = async (overrideContainer?: VideoContainerPreference) => {
    setBusy(true);
    setProgress(0);
    setProgressLabel('Rendering frames...');
    setVideoPreviewError(null);
    try {
      if (tab === 'video') {
        if (createdVideo?.url) {
          URL.revokeObjectURL(createdVideo.url);
          setCreatedVideo(null);
        }
        const chosenContainer = overrideContainer ?? videoContainer;
        const res = await exportVideo(project, {
          scale,
          container: chosenContainer,
          repeatCount,
          videoBitsPerSecond: videoQualityBps,
          includeAudio,
          onProgress: (pct, phase) => {
            setProgress(pct);
            setProgressLabel(
              phase === 'rendering' ? 'Compositing frames...' : 'Recording video stream...'
            );
          },
        });
        const filename = `${slug}.${res.extension}`;
        const url = URL.createObjectURL(res.blob);
        setCreatedVideo({
          url,
          blob: res.blob,
          filename,
          durationSec: res.durationSec,
          width: res.width,
          height: res.height,
          hasAudio: Boolean(includeAudio && project.audio && !project.audio.muted),
        });
        downloadBlob(res.blob, filename);
        onNotify(`Created ${res.extension.toUpperCase()} video (${res.width}×${res.height}).`);
        return;
      }

      if (tab === 'gif') {
        const blob = await exportAnimatedGif(project, scale, transparentBg, setProgress);
        downloadBlob(blob, `${slug}.gif`);
        onNotify('Animated GIF exported.');
      } else if (tab === 'spritesheet') {
        const { pngBlob, jsonBlob } = await exportSpriteSheet(
          project,
          columns,
          scale,
          transparentBg,
          includeAtlas
        );
        downloadBlob(pngBlob, `${slug}-spritesheet.png`);
        if (jsonBlob) {
          setTimeout(() => downloadBlob(jsonBlob, `${slug}-atlas.json`), 250);
        }
        onNotify('Sprite sheet exported.');
      } else if (tab === 'pngzip') {
        const zipBlob = await exportPngSequenceZip(project, scale, transparentBg, setProgress);
        downloadBlob(zipBlob, `${slug}-frames.zip`);
        onNotify('PNG sequence ZIP exported.');
      } else if (tab === 'project') {
        exportProjectJson(project);
        onNotify('Project JSON saved.');
      }
      onClose();
    } catch (err) {
      onNotify(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const outW = Math.round(project.width * scale);
  const outH = Math.round(project.height * scale);
  const evenW = outW % 2 === 0 ? outW : outW + 1;
  const evenH = outH % 2 === 0 ? outH : outH + 1;
  const rows = Math.ceil(project.frames.length / Math.max(1, columns));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#181B23] border border-[#2D3444] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#262B36] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#F4F5F7]">Create Video & Export</h2>
            <p className="text-xs text-[#9CA3AF]">
              {project.name} · {project.frames.length} frames · {project.fps} FPS
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#252A36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Tabs */}
        <div className="px-5 pt-4 shrink-0">
          <div className="grid grid-cols-5 gap-1 bg-[#111318] p-1 rounded-lg">
            {[
              { id: 'video' as const, label: 'Video', icon: Video },
              { id: 'gif' as const, label: 'GIF', icon: Film },
              { id: 'spritesheet' as const, label: 'Sprite Sheet', icon: Grid },
              { id: 'pngzip' as const, label: 'PNG Zip', icon: FileImage },
              { id: 'project' as const, label: 'Project File', icon: FileCode2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setTab(item.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === item.id
                      ? 'bg-[#262C3A] text-white'
                      : 'text-[#8B93A5] hover:text-[#D1D5DB]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {tab === 'video' && (
            <>
              {!videoSupport.supported && (
                <div className="rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-xs text-[#FCD34D]">
                  MediaRecorder video capture is unavailable in this browser. Try Chrome, Edge, or
                  the CelDraft desktop app, or export as Animated GIF / PNG Sequence.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                    Video Format
                  </label>
                  <select
                    value={videoContainer}
                    onChange={(e) => setVideoContainer(e.target.value as VideoContainerPreference)}
                    className="w-full bg-[#111318] border border-[#2C3240] rounded-lg px-3 py-2 text-xs text-[#F4F5F7]"
                  >
                    <option value="auto">
                      Auto ({videoSupport.supportsMp4 ? 'MP4 H.264' : 'WebM VP9/VP8'})
                    </option>
                    <option value="mp4" disabled={!videoSupport.supportsMp4}>
                      MP4 (.mp4){!videoSupport.supportsMp4 ? ' — Not supported here' : ''}
                    </option>
                    <option value="webm" disabled={!videoSupport.supportsWebm}>
                      WebM (.webm){!videoSupport.supportsWebm ? ' — Not supported here' : ''}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                    Resolution Scale
                  </label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full bg-[#111318] border border-[#2C3240] rounded-lg px-3 py-2 text-xs text-[#F4F5F7]"
                  >
                    <option value={0.5}>
                      0.5x ({Math.round(project.width * 0.5)}×{Math.round(project.height * 0.5)})
                    </option>
                    <option value={1}>
                      1.0x ({evenW}×{evenH})
                    </option>
                    <option value={1.5}>
                      1.5x ({Math.round(project.width * 1.5)}×{Math.round(project.height * 1.5)})
                    </option>
                    <option value={2}>
                      2.0x ({Math.round(project.width * 2)}×{Math.round(project.height * 2)})
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                    Encoding Quality
                  </label>
                  <select
                    value={videoQualityBps}
                    onChange={(e) => setVideoQualityBps(Number(e.target.value))}
                    className="w-full bg-[#111318] border border-[#2C3240] rounded-lg px-3 py-2 text-xs text-[#F4F5F7]"
                  >
                    <option value={4_000_000}>Standard (4 Mbps · Smaller file)</option>
                    <option value={8_000_000}>High (8 Mbps · Recommended)</option>
                    <option value={14_000_000}>Studio (14 Mbps · Sharpest lines)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                    Loop Repeats
                  </label>
                  <select
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(Number(e.target.value))}
                    className="w-full bg-[#111318] border border-[#2C3240] rounded-lg px-3 py-2 text-xs text-[#F4F5F7]"
                  >
                    <option value={1}>1x ({baseDurationSec.toFixed(2)}s)</option>
                    <option value={2}>2x ({(baseDurationSec * 2).toFixed(2)}s)</option>
                    <option value={3}>3x ({(baseDurationSec * 3).toFixed(2)}s)</option>
                    <option value={5}>5x ({(baseDurationSec * 5).toFixed(2)}s)</option>
                  </select>
                </div>
              </div>

              {/* Audio Track Mixing Toggle */}
              <label className="flex items-center justify-between bg-[#111318] border border-[#2C3240] rounded-lg px-3.5 py-2.5 cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Music
                    className={`w-4 h-4 shrink-0 ${
                      project.audio ? 'text-[#FF5A36]' : 'text-[#6B7280]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#D1D5DB]">
                      Include Audio Track in Video
                    </div>
                    <div className="text-[11px] text-[#8B93A5] truncate">
                      {project.audio
                        ? `${project.audio.name} (${project.audio.duration.toFixed(2)}s)${
                            project.audio.muted ? ' · Muted in project' : ''
                          }`
                        : 'No audio attached (add voice or music in Lip Sync panel)'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!project.audio}
                  checked={Boolean(project.audio) && includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="accent-[#FF5A36] shrink-0"
                />
              </label>

              {/* Video Output Spec Bar */}
              <div className="bg-[#111318] border border-[#262B36] rounded-lg px-3.5 py-2.5 flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>
                  Output: {evenW}×{evenH}px · {project.fps} FPS
                </span>
                <span className="font-mono tabular-nums text-[#F4F5F7]">
                  ~{videoTotalDurationSec}s
                </span>
              </div>

              {/* Live Rendered Video Preview */}
              {createdVideo && (
                <div className="rounded-xl border border-[#2E3545] bg-[#111318] p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#10B981]">
                      Video Ready: {createdVideo.filename} ({createdVideo.durationSec}s)
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadBlob(createdVideo.blob, createdVideo.filename)}
                      className="flex items-center gap-1 text-[#38BDF8] hover:underline font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Again</span>
                    </button>
                  </div>
                  <video
                    key={createdVideo.url}
                    src={createdVideo.url}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={() =>
                      setVideoPreviewError(
                        'This browser could not play the selected video codec inline.'
                      )
                    }
                    className="w-full max-h-56 rounded-lg bg-black object-contain"
                  />
                  {createdVideo.hasAudio && !videoPreviewError && (
                    <p className="text-[11px] text-[#8B93A5]">
                      Preview starts muted for browser autoplay — use the player speaker icon to hear audio.
                    </p>
                  )}
                  {videoPreviewError && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 px-3 py-2 text-[11px] text-[#FCA5A5]">
                      <span>{videoPreviewError}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoContainer('webm');
                          void handleExport('webm');
                        }}
                        className="shrink-0 px-2.5 py-1 rounded bg-[#FF5A36] text-white font-semibold hover:bg-[#FF6E4E]"
                      >
                        Retry as WebM
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab !== 'video' && tab !== 'project' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                    Output Scale
                  </label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full bg-[#111318] border border-[#2C3240] rounded-lg px-3 py-2 text-xs text-[#F4F5F7]"
                  >
                    <option value={0.5}>
                      0.5x ({Math.round(project.width * 0.5)}×{Math.round(project.height * 0.5)})
                    </option>
                    <option value={1}>
                      1.0x ({project.width}×{project.height})
                    </option>
                    <option value={1.5}>
                      1.5x ({Math.round(project.width * 1.5)}×{Math.round(project.height * 1.5)})
                    </option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center justify-between bg-[#111318] border border-[#2C3240] rounded-lg px-3 py-2 cursor-pointer">
                    <span className="text-xs text-[#D1D5DB]">Transparent Background</span>
                    <input
                      type="checkbox"
                      checked={transparentBg}
                      onChange={(e) => setTransparentBg(e.target.checked)}
                      className="accent-[#FF5A36]"
                    />
                  </label>
                </div>
              </div>

              {tab === 'spritesheet' && (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">
                      Columns (Grid: {columns}×{rows})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, project.frames.length)}
                      value={columns}
                      onChange={(e) =>
                        setColumns(
                          Math.max(1, Math.min(project.frames.length, Number(e.target.value) || 1))
                        )
                      }
                      className="w-full bg-[#111318] border border-[#2C3240] rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-[#F4F5F7]"
                    />
                    <p className="text-[11px] font-mono text-[#6B7280] mt-1 tabular-nums">
                      Sheet: {columns * outW}×{rows * outH}px
                    </p>
                  </div>

                  <div className="flex flex-col justify-start pt-5">
                    <label className="flex items-center justify-between bg-[#111318] border border-[#2C3240] rounded-lg px-3 py-2 cursor-pointer">
                      <span className="text-xs text-[#D1D5DB]">Include JSON Atlas</span>
                      <input
                        type="checkbox"
                        checked={includeAtlas}
                        onChange={(e) => setIncludeAtlas(e.target.checked)}
                        className="accent-[#FF5A36]"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="bg-[#111318] border border-[#262B36] rounded-lg p-3 flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF]">
                  {tab === 'gif' && `Loops continuously at ${project.fps} FPS (${outW}×${outH}px).`}
                  {tab === 'spritesheet' &&
                    `Packs ${project.frames.length} frames into a single game-ready PNG sheet.`}
                  {tab === 'pngzip' &&
                    `Exports ${project.frames.length} numbered PNG frames inside a ZIP archive.`}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await exportCurrentFramePng(project, currentFrameIndex, transparentBg);
                    onNotify('Current frame PNG exported.');
                  }}
                  className="ml-3 shrink-0 flex items-center gap-1 text-[#38BDF8] hover:underline font-medium"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Current Frame Only</span>
                </button>
              </div>
            </>
          )}

          {tab === 'project' && (
            <div className="bg-[#111318] border border-[#262B36] rounded-lg p-4 text-xs text-[#C7CDD8] leading-relaxed">
              Exports the complete project—including all layers, frames, onion skin settings, and
              imported audio—as a portable{' '}
              <code className="font-mono text-[#FF5A36]">.celdraft.json</code> archive that you can
              re-import in the Projects Hub.
            </div>
          )}

          {busy && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>{progressLabel}</span>
                <span className="font-mono tabular-nums">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#111318] overflow-hidden">
                <div
                  className="h-full bg-[#FF5A36] transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#14171E] border-t border-[#262B36] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#20242E] hover:bg-[#2A303E] text-xs font-medium text-[#D1D5DB]"
          >
            {createdVideo ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={busy || (tab === 'video' && !videoSupport.supported)}
            onClick={() => void handleExport()}
            className="px-4 py-2 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5"
          >
            {tab === 'video' ? <Video className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>
              {busy
                ? tab === 'video'
                  ? 'Creating Video...'
                  : 'Exporting...'
                : tab === 'video'
                ? createdVideo
                  ? 'Re-render Video'
                  : 'Create & Download Video'
                : 'Download Export'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
