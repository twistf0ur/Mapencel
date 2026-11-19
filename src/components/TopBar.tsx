import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen,
  Grid3X3,
  Layers2,
  LayoutTemplate,
  Maximize2,
  Monitor,
  MonitorDown,
  Pause,
  Play,
  Redo2,
  Repeat,
  Scan,
  Undo2,
  Video,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { WorkspaceLayout } from '../types/animation';

interface TopBarProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  onOpenProjects: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  loop: boolean;
  onToggleLoop: () => void;
  fps: number;
  onChangeFps: (fps: number) => void;
  currentFrameIndex: number;
  totalFrames: number;
  onStepFrame: (delta: number) => void;
  onionSkinEnabled: boolean;
  onToggleOnionSkin: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showSafeZones: boolean;
  onToggleSafeZones: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitZoom: () => void;
  layout: WorkspaceLayout;
  onChangeLayout: (layout: WorkspaceLayout) => void;
  onOpenSheets: () => void;
  onOpenCreateVideo?: () => void;
  onOpenExport: () => void;
  onOpenDesktopApp?: () => void;
  onGoHome?: () => void;
  saveStatus: 'saved' | 'saving';
}

const LAYOUT_OPTIONS: {
  id: WorkspaceLayout;
  label: string;
  desc: string;
}[] = [
  {
    id: 'studio',
    label: 'Classic Studio',
    desc: 'Tools left, inspector right, bottom filmstrip',
  },
  {
    id: 'storyboard',
    label: 'Storyboard Grid',
    desc: 'Multi-column frame sheet docked on the right',
  },
  {
    id: 'focus',
    label: 'Focus Light-Table',
    desc: 'Maximized canvas with slim tool rail & compact strip',
  },
  {
    id: 'mirrored',
    label: 'Left-Handed',
    desc: 'Tools on the right, inspector on the left',
  },
];

const LayoutMiniIcon: React.FC<{ id: WorkspaceLayout; active: boolean }> = ({ id, active }) => {
  const accent = active ? '#FF5A36' : '#6B7280';
  const block = active ? '#343B4D' : '#252A36';

  if (id === 'studio') {
    return (
      <svg width="36" height="24" viewBox="0 0 36 24" className="shrink-0 rounded border border-[#2F3646] bg-[#111318]">
        <rect x="2" y="2" width="6" height="13" rx="1" fill={block} />
        <rect x="10" y="2" width="16" height="13" rx="1" fill="#181C24" />
        <rect x="28" y="2" width="6" height="13" rx="1" fill={block} />
        <rect x="2" y="17" width="32" height="5" rx="1" fill={accent} fillOpacity="0.85" />
      </svg>
    );
  }
  if (id === 'storyboard') {
    return (
      <svg width="36" height="24" viewBox="0 0 36 24" className="shrink-0 rounded border border-[#2F3646] bg-[#111318]">
        <rect x="2" y="2" width="5" height="20" rx="1" fill={block} />
        <rect x="9" y="2" width="13" height="20" rx="1" fill="#181C24" />
        <rect x="24" y="2" width="5" height="9" rx="1" fill={accent} fillOpacity="0.85" />
        <rect x="30" y="2" width="4" height="9" rx="1" fill={accent} fillOpacity="0.85" />
        <rect x="24" y="13" width="5" height="9" rx="1" fill={accent} fillOpacity="0.85" />
        <rect x="30" y="13" width="4" height="9" rx="1" fill={accent} fillOpacity="0.85" />
      </svg>
    );
  }
  if (id === 'focus') {
    return (
      <svg width="36" height="24" viewBox="0 0 36 24" className="shrink-0 rounded border border-[#2F3646] bg-[#111318]">
        <rect x="2" y="2" width="3" height="15" rx="1" fill={block} />
        <rect x="7" y="2" width="27" height="15" rx="1" fill="#181C24" />
        <rect x="2" y="19" width="32" height="3" rx="1" fill={accent} fillOpacity="0.85" />
      </svg>
    );
  }
  return (
    <svg width="36" height="24" viewBox="0 0 36 24" className="shrink-0 rounded border border-[#2F3646] bg-[#111318]">
      <rect x="2" y="2" width="8" height="13" rx="1" fill={block} />
      <rect x="12" y="2" width="16" height="13" rx="1" fill="#181C24" />
      <rect x="30" y="2" width="4" height="13" rx="1" fill={block} stroke={accent} strokeWidth="0.8" />
      <rect x="2" y="17" width="32" height="5" rx="1" fill={accent} fillOpacity="0.85" />
    </svg>
  );
};

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  onRenameProject,
  onOpenProjects,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isPlaying,
  onTogglePlay,
  loop,
  onToggleLoop,
  fps,
  onChangeFps,
  currentFrameIndex,
  totalFrames,
  onStepFrame,
  onionSkinEnabled,
  onToggleOnionSkin,
  showGrid,
  onToggleGrid,
  showSafeZones,
  onToggleSafeZones,
  zoom,
  onZoomChange,
  onFitZoom,
  layout,
  onChangeLayout,
  onOpenSheets,
  onOpenCreateVideo,
  onOpenExport,
  onOpenDesktopApp,
  onGoHome,
  saveStatus,
}) => {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!layoutOpen) return;
    const onDown = (e: MouseEvent) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setLayoutOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [layoutOpen]);

  const currentLayoutLabel =
    LAYOUT_OPTIONS.find((opt) => opt.id === layout)?.label.split(' ')[0] || 'Studio';

  return (
    <header className="h-12 bg-[#161920] border-b border-[#262B36] px-3 flex items-center justify-between gap-4 select-none shrink-0 z-30">
      {/* Zone 1: Brand + Project + History */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onGoHome}
          title="Back to CelDraft Home"
          className="flex items-center gap-2 pr-2 border-r border-[#262B36] shrink-0 hover:opacity-85 transition-opacity"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="3" y="4" width="14" height="14" rx="3" stroke="#5A6377" strokeWidth="1.8" />
            <rect x="7" y="6" width="14" height="14" rx="3" fill="#161920" stroke="#FF5A36" strokeWidth="2" />
            <circle cx="14" cy="13" r="2.5" fill="#FF5A36" />
          </svg>
          <span className="font-bold text-sm tracking-tight text-[#F4F5F7] whitespace-nowrap">
            CelDraft
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenProjects}
          title="Projects Hub"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#20242E] hover:bg-[#282D3A] text-xs font-medium text-[#D1D5DB] transition-colors whitespace-nowrap shrink-0"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span>Projects</span>
        </button>

        <button
          type="button"
          onClick={onOpenSheets}
          title="Animation Screen Sheets (YouTube, TikTok, Instagram)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#20242E] hover:bg-[#282D3A] text-xs font-medium text-[#D1D5DB] transition-colors whitespace-nowrap shrink-0"
        >
          <Monitor className="w-3.5 h-3.5 text-[#FF5A36]" />
          <span className="hidden sm:inline">Sheets</span>
        </button>

        <input
          type="text"
          value={projectName}
          onChange={(e) => onRenameProject(e.target.value)}
          aria-label="Project title"
          className="bg-transparent hover:bg-[#1E222B] focus:bg-[#20242E] border border-transparent focus:border-[#3A4152] rounded-md px-2 py-1 text-xs font-semibold text-[#F4F5F7] w-32 sm:w-40 truncate transition-colors"
        />

        <span className="hidden xl:inline-block text-[11px] text-[#6B7280] font-medium whitespace-nowrap">
          {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
        </span>

        <div className="flex items-center gap-0.5 pl-1 border-l border-[#262B36] shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-md text-[#C7CDD8] hover:bg-[#242934] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-md text-[#C7CDD8] hover:bg-[#242934] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone 2: Transport, FPS, Onion Skin, Grid, Zoom, Display Layout */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center bg-[#1D212A] border border-[#2A303D] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onStepFrame(-1)}
            title="Previous Frame (,)"
            className="p-1.5 rounded-md text-[#C7CDD8] hover:bg-[#282D3A] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (P)' : 'Play Animation (P)'}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              isPlaying
                ? 'bg-[#FF5A36] text-white'
                : 'bg-[#282D3A] hover:bg-[#323848] text-[#F4F5F7]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(1)}
            title="Next Frame (.)"
            className="p-1.5 rounded-md text-[#C7CDD8] hover:bg-[#282D3A] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleLoop}
            title="Loop Playback"
            className={`p-1.5 rounded-md transition-colors ${
              loop ? 'text-[#FF5A36] bg-[#FF5A36]/15' : 'text-[#7A8396] hover:text-[#C7CDD8]'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D212A] border border-[#2A303D] font-mono text-xs tabular-nums">
          <span className="text-[#F4F5F7] font-semibold">
            {String(currentFrameIndex + 1).padStart(3, '0')}
          </span>
          <span className="text-[#6B7280]">/</span>
          <span className="text-[#9CA3AF]">{String(totalFrames).padStart(3, '0')}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1D212A] border border-[#2A303D]">
          <label htmlFor="fps-input" className="text-[11px] text-[#9CA3AF] font-medium">
            FPS
          </label>
          <input
            id="fps-input"
            type="number"
            min={1}
            max={30}
            value={fps}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) onChangeFps(Math.max(1, Math.min(30, v)));
            }}
            className="w-10 bg-transparent text-right font-mono text-xs font-semibold text-[#F4F5F7] tabular-nums focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 pl-1 border-l border-[#262B36]">
          <button
            type="button"
            onClick={onToggleOnionSkin}
            title="Toggle Onion Skin (O)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              onionSkinEnabled
                ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/35'
                : 'bg-[#1D212A] text-[#9CA3AF] hover:text-[#F4F5F7] border border-transparent'
            }`}
          >
            <Layers2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Onion</span>
          </button>

          <button
            type="button"
            onClick={onToggleGrid}
            title="Toggle Stage Grid (G)"
            className={`p-1.5 rounded-md transition-colors ${
              showGrid
                ? 'bg-[#282D3A] text-[#F4F5F7] border border-[#3A4152]'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7] hover:bg-[#1D212A] border border-transparent'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSafeZones}
            title="Toggle Platform Safe-Zone Guides"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              showSafeZones
                ? 'bg-[#FF5A36]/15 text-[#FF5A36] border border-[#FF5A36]/40'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7] hover:bg-[#1D212A] border border-transparent'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Safe</span>
          </button>

          <div className="hidden sm:flex items-center bg-[#1D212A] border border-[#2A303D] rounded-md px-1">
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(0.2, +(zoom - 0.15).toFixed(2)))}
              title="Zoom Out"
              className="p-1 text-[#9CA3AF] hover:text-[#F4F5F7]"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] tabular-nums text-[#D1D5DB] w-11 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(4, +(zoom + 0.15).toFixed(2)))}
              title="Zoom In"
              className="p-1 text-[#9CA3AF] hover:text-[#F4F5F7]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onFitZoom}
              title="Fit Canvas to Viewport"
              className="p-1 text-[#9CA3AF] hover:text-[#F4F5F7] border-l border-[#2A303D] ml-0.5 pl-1.5"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Display Layout Switcher Popover */}
          <div ref={layoutMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setLayoutOpen((o) => !o)}
              title="Switch Display Layout"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                layoutOpen
                  ? 'bg-[#2A303E] text-[#F4F5F7] border border-[#FF5A36]/60'
                  : 'bg-[#1D212A] hover:bg-[#252A36] text-[#D1D5DB] border border-[#2A303D]'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span className="hidden lg:inline">{currentLayoutLabel}</span>
              <ChevronDown className="w-3 h-3 text-[#8B93A5]" />
            </button>

            {layoutOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#1A1E27] border border-[#2E3545] rounded-xl shadow-2xl p-2 z-50">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-[#9CA3AF]">
                  Display Layout
                </div>
                <div className="space-y-1">
                  {LAYOUT_OPTIONS.map((opt) => {
                    const active = opt.id === layout;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChangeLayout(opt.id);
                          setLayoutOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                          active
                            ? 'bg-[#252B3B] border border-[#FF5A36]/60'
                            : 'hover:bg-[#222734] border border-transparent'
                        }`}
                      >
                        <LayoutMiniIcon id={opt.id} active={active} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#F4F5F7]">
                              {opt.label}
                            </span>
                            {active && <Check className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />}
                          </div>
                          <div className="text-[11px] text-[#8B93A5] truncate">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone 3: Desktop Offline App + Create Video + Export */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenDesktopApp && (
          <button
            type="button"
            onClick={onOpenDesktopApp}
            title="Offline Mode & Windows Desktop App (.exe)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#20242E] hover:bg-[#282D3A] border border-[#2C3342] text-xs font-medium text-[#D1D5DB] transition-colors whitespace-nowrap shrink-0"
          >
            <MonitorDown className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="hidden xl:inline">App / .exe</span>
          </button>
        )}
        {onOpenCreateVideo && (
          <button
            type="button"
            onClick={onOpenCreateVideo}
            title="Create MP4 / WebM Video with Audio"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20242E] hover:bg-[#2A303E] border border-[#323A4C] text-xs font-semibold text-[#F4F5F7] transition-colors whitespace-nowrap shrink-0"
          >
            <Video className="w-3.5 h-3.5 text-[#FF5A36]" />
            <span className="hidden md:inline">Create Video</span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
