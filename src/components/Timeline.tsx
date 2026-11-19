import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Pause,
  Play,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import { AudioTrackData, FrameData, Layer } from '../types/animation';
import { generateThumbnailDataUrl } from '../utils/drawing';

interface TimelineProps {
  frames: FrameData[];
  layers: Layer[];
  width: number;
  height: number;
  backgroundColor: string;
  fps: number;
  currentFrameIndex: number;
  isPlaying: boolean;
  loop: boolean;
  audio: AudioTrackData | null;
  hasCopiedFrame: boolean;
  variant?: 'strip' | 'compact' | 'grid';
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onStepFrame: (delta: number) => void;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (index: number) => void;
  onDeleteFrame: (index: number) => void;
  onMoveFrame: (index: number, delta: number) => void;
  onCopyFrame: (index: number) => void;
  onPasteFrame: (index: number) => void;
  onSetFrameHold: (index: number, hold: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  layers,
  width,
  height,
  backgroundColor,
  fps,
  currentFrameIndex,
  isPlaying,
  loop,
  audio,
  hasCopiedFrame,
  variant = 'strip',
  onTogglePlay,
  onToggleLoop,
  onStepFrame,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrame,
  onCopyFrame,
  onPasteFrame,
  onSetFrameHold,
}) => {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const activeCardRef = useRef<HTMLButtonElement | null>(null);
  const thumbSigRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const layerSig = layers
      .map((l) => `${l.id}:${l.visible}:${l.opacity}:${l.blendMode}`)
      .join('|');
    const stageSig = `${width}x${height}:${backgroundColor}:${layerSig}`;

    const buildThumbs = async () => {
      const updates: Record<string, string> = {};
      let hasUpdates = false;

      for (let i = 0; i < frames.length; i++) {
        if (cancelled) return;
        const frame = frames[i];
        const celSig = `${stageSig}::${JSON.stringify(frame.cels)}`;
        if (thumbSigRef.current[frame.id] === celSig && thumbnails[frame.id]) {
          continue;
        }
        const url = await generateThumbnailDataUrl(
          frame,
          layers,
          width,
          height,
          backgroundColor,
          140
        ).catch(() => '');
        if (cancelled) return;
        thumbSigRef.current[frame.id] = celSig;
        updates[frame.id] = url;
        hasUpdates = true;
      }

      if (!cancelled && hasUpdates) {
        setThumbnails((prev) => ({ ...prev, ...updates }));
      }
    };

    const timer = setTimeout(buildThumbs, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [frames, layers, width, height, backgroundColor]);

  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({
        behavior: isPlaying ? 'auto' : 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [currentFrameIndex, isPlaying]);

  const currentFrame = frames[currentFrameIndex];
  const totalSeconds = frames.reduce((acc, f) => acc + (f.hold || 1) / fps, 0);

  const isGrid = variant === 'grid';
  const isCompact = variant === 'compact';

  return (
    <section
      aria-label="Animation Timeline"
      className={
        isGrid
          ? 'flex-1 min-h-0 bg-[#15181F] flex flex-col select-none'
          : `${
              isCompact ? 'h-30' : 'h-48'
            } bg-[#15181F] border-t border-[#262B36] flex flex-col shrink-0 select-none z-20`
      }
    >
      {/* Timeline Header: Playback Controls + Frame Manager Actions */}
      <div
        className={`${
          isGrid ? 'px-3 py-2 flex-wrap gap-2' : 'h-10 px-3 gap-3'
        } border-b border-[#232834] flex items-center justify-between`}
      >
        {/* Compact Timeline Playback Controls & Timecode */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-[#1D212A] border border-[#2A303D] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onStepFrame(-1)}
              title="Previous Frame (,)"
              className="p-1 rounded-md text-[#C7CDD8] hover:bg-[#282D3A] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause Playback (P)' : 'Play Animation (P)'}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                isPlaying
                  ? 'bg-[#FF5A36] text-white'
                  : 'bg-[#282D3A] hover:bg-[#343B4C] text-[#F4F5F7]'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              type="button"
              onClick={() => onStepFrame(1)}
              title="Next Frame (.)"
              className="p-1 rounded-md text-[#C7CDD8] hover:bg-[#282D3A] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleLoop}
              title={loop ? 'Loop Enabled' : 'Loop Disabled'}
              className={`p-1 rounded-md transition-colors ${
                loop ? 'text-[#FF5A36] bg-[#FF5A36]/15' : 'text-[#7A8396] hover:text-[#C7CDD8]'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#9CA3AF] tabular-nums whitespace-nowrap">
            <span className="text-[#F4F5F7] font-semibold">
              F{String(currentFrameIndex + 1).padStart(2, '0')}
            </span>
            <span className="text-[#6B7280]"> / {String(frames.length).padStart(2, '0')}</span>
            {!isGrid && (
              <span className="hidden md:inline text-[#6B7280]">
                {' '}
                · {totalSeconds.toFixed(2)}s @ {fps}fps
              </span>
            )}
          </div>
        </div>

        {/* Frame Manager Actions */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={onAddFrame}
            title="Add Blank Frame After Current"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FF5A36] hover:bg-[#FF6E4E] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isGrid ? 'Add' : 'Add Frame'}</span>
          </button>

          <button
            type="button"
            onClick={() => onDuplicateFrame(currentFrameIndex)}
            title="Duplicate Current Frame"
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#20242E] hover:bg-[#2A303E] text-xs font-medium text-[#D1D5DB] transition-colors whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            {!isGrid && <span>Duplicate</span>}
          </button>

          {!isGrid && (
            <>
              <button
                type="button"
                onClick={() => onCopyFrame(currentFrameIndex)}
                title="Copy Frame"
                className="hidden sm:inline-flex px-2 py-1 rounded-md bg-[#20242E] hover:bg-[#2A303E] text-xs text-[#D1D5DB] transition-colors shrink-0"
              >
                Copy
              </button>

              <button
                type="button"
                onClick={() => onPasteFrame(currentFrameIndex)}
                disabled={!hasCopiedFrame}
                title="Paste Copied Frame"
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-[#20242E] hover:bg-[#2A303E] text-xs text-[#D1D5DB] disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
              >
                <Clipboard className="w-3 h-3" />
                <span className="hidden md:inline">Paste</span>
              </button>

              <div className="hidden sm:block h-4 w-px bg-[#2A303E] mx-0.5 shrink-0" />
            </>
          )}

          <button
            type="button"
            onClick={() => onMoveFrame(currentFrameIndex, -1)}
            disabled={currentFrameIndex === 0}
            title="Move Frame Left"
            className="p-1.5 rounded-md bg-[#20242E] hover:bg-[#2A303E] text-[#D1D5DB] disabled:opacity-30 disabled:pointer-events-none shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMoveFrame(currentFrameIndex, 1)}
            disabled={currentFrameIndex >= frames.length - 1}
            title="Move Frame Right"
            className="p-1.5 rounded-md bg-[#20242E] hover:bg-[#2A303E] text-[#D1D5DB] disabled:opacity-30 disabled:pointer-events-none shrink-0"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {!isGrid && !isCompact && (
            <div className="hidden md:flex items-center gap-1 ml-1 pl-2 border-l border-[#2A303E] shrink-0">
              <span className="text-[11px] text-[#9CA3AF]">Hold</span>
              <select
                value={currentFrame?.hold || 1}
                onChange={(e) => onSetFrameHold(currentFrameIndex, Number(e.target.value))}
                className="bg-[#111318] border border-[#2C3240] rounded px-1.5 py-0.5 text-[11px] font-mono tabular-nums text-[#F4F5F7]"
                title="Frame hold exposure"
              >
                {[1, 2, 3, 4, 6, 8].map((h) => (
                  <option key={h} value={h}>
                    {h}x
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => onDeleteFrame(currentFrameIndex)}
            disabled={frames.length <= 1}
            title="Delete Selected Frame"
            className="flex items-center gap-1 px-2 py-1 ml-0.5 rounded-md bg-[#20242E] hover:bg-[#F43F5E]/20 text-[#9CA3AF] hover:text-[#F43F5E] disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {!isGrid && <span className="hidden lg:inline text-xs font-medium">Delete</span>}
          </button>
        </div>
      </div>

      {/* Audio Waveform Track Strip (if audio loaded and not compact) */}
      {audio && !isCompact && (
        <div className="h-7 px-3 bg-[#12151C] border-b border-[#232834] flex items-center gap-2 overflow-hidden">
          <span className="text-[10px] font-mono text-[#38BDF8] shrink-0 w-24 truncate">
            {audio.name}
          </span>
          <div className="flex-1 h-4 flex items-center gap-[2px] relative">
            {audio.peaks.slice(0, 120).map((peak, i) => {
              const progressPct = frames.length > 1 ? currentFrameIndex / (frames.length - 1) : 0;
              const barPct = i / 120;
              const isPassed = barPct <= progressPct;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-colors"
                  style={{
                    height: `${Math.max(15, Math.round(peak * 100))}%`,
                    backgroundColor: audio.muted
                      ? '#3A4152'
                      : isPassed
                      ? '#FF5A36'
                      : '#38BDF8',
                    opacity: audio.muted ? 0.45 : isPassed ? 0.95 : 0.55,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Frame Filmstrip (Horizontal Strip or Storyboard Grid) */}
      <div
        className={
          isGrid
            ? 'flex-1 overflow-y-auto p-2.5 grid grid-cols-2 gap-2 content-start'
            : 'flex-1 overflow-x-auto overflow-y-hidden px-3 py-2 flex items-center gap-2'
        }
      >
        {frames.map((frame, idx) => {
          const isActive = idx === currentFrameIndex;
          const thumbUrl = thumbnails[frame.id];
          const hold = frame.hold || 1;

          return (
            <button
              key={frame.id}
              ref={isActive ? activeCardRef : null}
              type="button"
              onClick={() => onSelectFrame(idx)}
              aria-current={isActive ? 'step' : undefined}
              className={`group relative rounded-lg p-1.5 transition-colors flex flex-col items-start border ${
                isGrid ? 'w-full' : 'shrink-0'
              } ${
                isActive
                  ? 'bg-[#262B38] border-[#FF5A36] ring-1 ring-[#FF5A36]/50'
                  : 'bg-[#1A1E27] border-[#262B36] hover:border-[#3D4557]'
              }`}
              style={!isGrid ? { width: (isCompact ? 78 : 102) + (hold - 1) * 14 } : undefined}
            >
              {isActive && (
                <span className="absolute -top-0.5 left-2 right-2 h-0.5 rounded-full bg-[#FF5A36]" />
              )}

              <div className="w-full flex items-center justify-between px-0.5 mb-1">
                <span
                  className={`font-mono text-[10px] font-semibold tabular-nums ${
                    isActive ? 'text-[#FF5A36]' : 'text-[#8B93A5]'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-1">
                  {frame.viseme && (
                    <span className="font-mono text-[9px] text-[#38BDF8]">
                      {frame.viseme}
                    </span>
                  )}
                  {hold > 1 && (
                    <span className="font-mono text-[9px] text-[#F59E0B]">
                      {hold}x
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`w-full ${
                  isCompact ? 'h-10' : isGrid ? 'h-20' : 'h-15'
                } rounded overflow-hidden bg-[#111318] border border-[#262B36] flex items-center justify-center`}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`Frame ${idx + 1}`}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full bg-[#1C2029]" />
                )}
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAddFrame}
          title="Add New Blank Frame"
          className={`rounded-lg border border-dashed border-[#343B4C] hover:border-[#FF5A36] hover:bg-[#1E232E] text-[#7A8396] hover:text-[#FF5A36] flex flex-col items-center justify-center gap-1 transition-colors ${
            isGrid ? 'w-full h-[106px]' : isCompact ? 'shrink-0 w-14 h-[66px]' : 'shrink-0 w-18 h-[88px]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-[10px] font-medium">New</span>
        </button>
      </div>
    </section>
  );
};
