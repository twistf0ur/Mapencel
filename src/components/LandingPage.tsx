import React, { useState } from 'react';
import {
  ArrowRight,
  Film,
  Layers,
  Mic,
  MonitorDown,
  Paintbrush,
  Play,
} from 'lucide-react';
import { WorkspaceLayout } from '../types/animation';

interface LandingPageProps {
  hasSavedProjects: boolean;
  onEnterStudio: (options?: {
    layout?: WorkspaceLayout;
    blankPreset?: {
      name: string;
      width: number;
      height: number;
      fps: number;
      screenSheetId?: string;
    };
  }) => void;
  onOpenDesktopApp?: () => void;
}

const CAPABILITY_LIST = [
  {
    num: '03.',
    title: 'Multi-Layer Cel Stack',
    desc: 'Separate stage backgrounds, rough pencils, ink linework, color fills, and mouth rigs with Normal, Multiply, and Screen blend modes.',
  },
  {
    num: '04.',
    title: 'Tactile Brush & Transform Tools',
    desc: 'Draw with Ink, Pencil, Marker, or Spray presets, flood-fill enclosed shapes, stamp text, and move, scale, or flip selections.',
  },
  {
    num: '05.',
    title: 'IndexedDB Autosave & Portable Archives',
    desc: 'Every stroke and frame saves automatically in browser storage with zero account lock-in and full .celdraft.json project backup.',
  },
];

const LAYOUT_CARDS: {
  id: WorkspaceLayout;
  title: string;
  desc: string;
}[] = [
  {
    id: 'studio',
    title: 'Classic Studio',
    desc: 'Tools on the left, layers on the right, and a horizontal filmstrip anchored below.',
  },
  {
    id: 'storyboard',
    title: 'Storyboard Grid',
    desc: 'Multi-column frame sheet docked on the right for organizing sequences at a glance.',
  },
  {
    id: 'focus',
    title: 'Focus Light-Table',
    desc: 'Slim tool rail and compact strip that dedicate nearly the entire screen to drawing.',
  },
  {
    id: 'mirrored',
    title: 'Left-Handed',
    desc: 'Mirrored tool dock on the right edge for natural left-hand stylus and tablet ergonomics.',
  },
];

const EXPORT_FORMATS = [
  {
    format: 'Video (MP4 / WebM with Audio)',
    detail: 'Frame-accurate video rendering with synchronized project audio and loop repeats.',
  },
  {
    format: 'Animated GIF',
    detail: 'Quantized palette loop matching exact frame rate and hold durations.',
  },
  {
    format: 'Sprite Sheet + JSON Atlas',
    detail: 'Configurable column grid packed with frame coordinates for 2D game engines.',
  },
  {
    format: 'PNG Sequence (.zip)',
    detail: 'Numbered lossless frames bundled into a single archive for video compositing.',
  },
  {
    format: 'Project Archive (.celdraft.json)',
    detail: 'Complete portable snapshot preserving layers, audio tracks, and visemes.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  hasSavedProjects,
  onEnterStudio,
  onOpenDesktopApp,
}) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [onionImgError, setOnionImgError] = useState(false);
  const [lipImgError, setLipImgError] = useState(false);

  return (
    <div className="min-h-screen bg-[#111318] text-[#F4F5F7] flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#111318]/90 backdrop-blur-md border-b border-[#232834]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F4F5F7] whitespace-nowrap shrink-0"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="4" width="14" height="14" rx="3" stroke="#5A6377" strokeWidth="1.8" />
              <rect x="7" y="6" width="14" height="14" rx="3" fill="#111318" stroke="#FF5A36" strokeWidth="2" />
              <circle cx="14" cy="13" r="2.5" fill="#FF5A36" />
            </svg>
            <span>CelDraft</span>
          </a>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9CA3AF]">
            <a
              href="#capabilities"
              className="hover:text-[#F4F5F7] transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#layouts"
              className="hover:text-[#F4F5F7] transition-colors whitespace-nowrap shrink-0"
            >
              Layouts
            </a>
            <a
              href="#exports"
              className="hover:text-[#F4F5F7] transition-colors whitespace-nowrap shrink-0"
            >
              Exports
            </a>
            <a
              href="#quickstart"
              className="hover:text-[#F4F5F7] transition-colors whitespace-nowrap shrink-0"
            >
              Quick Start
            </a>
          </nav>

          {/* Zone 3: Primary Action + Offline / .exe Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onOpenDesktopApp && (
              <button
                type="button"
                onClick={onOpenDesktopApp}
                title="Install Offline Desktop App (.exe)"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A1E27] hover:bg-[#232835] border border-[#2C3342] text-xs font-medium text-[#D1D5DB] transition-colors whitespace-nowrap shrink-0"
              >
                <MonitorDown className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="hidden sm:inline">Offline / .exe</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onEnterStudio()}
              className="px-4 py-2 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {hasSavedProjects ? 'Resume Studio' : 'Open Studio'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Section 1: Hero Split */}
        <section className="max-w-6xl mx-auto px-6 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="text-xs font-medium text-[#FF5A36] tracking-wide mb-4">
                Browser 2D Animation Studio
              </div>

              <h1
                className="font-bold tracking-tight text-[#F4F5F7] leading-[1.08] mb-5"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Frame-by-frame animation, drawn straight in your browser.
              </h1>

              <p className="text-base text-[#9CA3AF] leading-relaxed max-w-xl mb-8">
                Sketch traditional hand-drawn motion with directional onion skinning, multi-layer
                cel compositing, automatic audio lip sync, and instant GIF or game sprite sheet
                exports.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => onEnterStudio()}
                  className="px-6 py-3 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{hasSavedProjects ? 'Open Workspace' : 'Start Animating'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onEnterStudio({
                      blankPreset: {
                        name: 'YouTube 16:9 Animation',
                        width: 1280,
                        height: 720,
                        fps: 24,
                        screenSheetId: 'youtube-hd',
                      },
                    })
                  }
                  className="px-5 py-3 rounded-lg bg-[#1A1E27] hover:bg-[#232835] border border-[#2C3342] text-sm font-medium text-[#E5E7EB] transition-colors whitespace-nowrap shrink-0"
                >
                  New YouTube 16:9 Sheet
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280]">
                <span>No sign-up required</span>
                <span aria-hidden="true">·</span>
                <span>Local IndexedDB autosave</span>
                <span aria-hidden="true">·</span>
                <span>1–30 FPS playback</span>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-xl overflow-hidden border border-[#262C3A] bg-[#161920] aspect-video lg:aspect-auto lg:h-full">
                {!heroImgError ? (
                  <img
                    src="./src/assets/images/hero_animation_desk_1795098019495.jpg"
                    alt="Animator drawing frame-by-frame onion-skin character poses on a studio pen display"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[280px] bg-gradient-to-br from-[#1B1F29] to-[#12151C] flex flex-col items-center justify-center p-8 text-center">
                    <Film className="w-10 h-10 text-[#FF5A36] mb-3" />
                    <span className="text-sm font-semibold text-[#F4F5F7]">
                      CelDraft Drafting Stage
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Asymmetric Bento Capabilities */}
        <section id="capabilities" className="border-t border-[#202531] bg-[#13161D] py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F5F7] mb-3">
                Built around the real cel-animation workflow
              </h2>
              <p className="text-sm sm:text-base text-[#9CA3AF] leading-relaxed">
                Every tool maps directly to traditional 2D frame production—without bloated menus or
                cloud render queues.
              </p>
            </div>

            {/* Asymmetric 2-Row Bento + Editorial List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              {/* Feature 01 (2-col span visual card) */}
              <div className="lg:col-span-2 rounded-xl border border-[#262C3A] bg-[#181B23] overflow-hidden grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-xs text-[#FF5A36] mb-2">01. Onion Skinning</div>
                    <h3 className="text-xl font-bold text-[#F4F5F7] mb-3">
                      See spacing and arcs across adjacent frames
                    </h3>
                    <p className="text-sm text-[#9CA3AF] leading-relaxed">
                      Toggle translucent Rose previews for up to three previous drawings and Sky
                      blue previews for upcoming frames, with adjustable ghost opacity.
                    </p>
                  </div>
                  <div className="pt-6 text-xs font-mono text-[#6B7280] tabular-nums">
                    Prev 0–3 frames · Next 0–3 frames · Toggle key O
                  </div>
                </div>
                <div className="bg-[#111318] border-t md:border-t-0 md:border-l border-[#262C3A] min-h-[220px]">
                  {!onionImgError ? (
                    <img
                      src="./src/assets/images/bento_onion_skin_1795098018991.jpg"
                      alt="Layered rose and sky-blue onion skin character keyframes on a light-table"
                      referrerPolicy="no-referrer"
                      onError={() => setOnionImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6">
                      <Layers className="w-8 h-8 text-[#38BDF8]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Feature 02 (1-col visual card) */}
              <div className="rounded-xl border border-[#262C3A] bg-[#181B23] overflow-hidden flex flex-col">
                <div className="h-44 bg-[#111318] border-b border-[#262C3A]">
                  {!lipImgError ? (
                    <img
                      src="./src/assets/images/bento_lip_sync_1795098020103.jpg"
                      alt="Mouth viseme keyframes paired with an audio waveform"
                      referrerPolicy="no-referrer"
                      onError={() => setLipImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Mic className="w-8 h-8 text-[#FF5A36]" />
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-xs text-[#38BDF8] mb-2">
                      02. Audio & Lip Sync
                    </div>
                    <h3 className="text-lg font-bold text-[#F4F5F7] mb-2">
                      Automatic mouth visemes from dialogue
                    </h3>
                    <p className="text-sm text-[#9CA3AF] leading-relaxed">
                      Import MP3 or WAV audio—or load the built-in voice clip—to analyze RMS speech
                      energy and stamp animated mouths onto a dedicated layer.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean numbered capability rows */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CAPABILITY_LIST.map((cap) => (
                <div
                  key={cap.num}
                  className="p-6 rounded-xl border border-[#262C3A] bg-[#161920]"
                >
                  <div className="font-mono text-xs text-[#9CA3AF] mb-2">{cap.num}</div>
                  <h3 className="text-base font-semibold text-[#F4F5F7] mb-2">{cap.title}</h3>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{cap.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Selectable Display Layouts */}
        <section id="layouts" className="border-t border-[#202531] py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F5F7] mb-2">
                  Four workspace display layouts
                </h2>
                <p className="text-sm sm:text-base text-[#9CA3AF] max-w-xl">
                  Switch layouts anytime from the top bar—or launch directly into the arrangement
                  that fits your screen and drawing hand.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {LAYOUT_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onEnterStudio({ layout: card.id })}
                  className="group text-left p-5 rounded-xl border border-[#262C3A] bg-[#161920] hover:border-[#FF5A36]/70 transition-colors flex flex-col justify-between"
                >
                  <div>
                    {/* Mini structural wireframe diagram */}
                    <div className="h-24 rounded-lg bg-[#111318] border border-[#242A36] p-2.5 mb-4 flex flex-col gap-1.5">
                      {card.id === 'studio' && (
                        <>
                          <div className="flex-1 flex gap-1.5">
                            <div className="w-5 rounded bg-[#282E3D]" />
                            <div className="flex-1 rounded bg-[#1B202A]" />
                            <div className="w-7 rounded bg-[#282E3D]" />
                          </div>
                          <div className="h-4 rounded bg-[#FF5A36]/75" />
                        </>
                      )}
                      {card.id === 'storyboard' && (
                        <div className="flex-1 flex gap-1.5">
                          <div className="w-5 rounded bg-[#282E3D]" />
                          <div className="flex-1 rounded bg-[#1B202A]" />
                          <div className="w-14 grid grid-cols-2 gap-1">
                            <div className="rounded bg-[#FF5A36]/75" />
                            <div className="rounded bg-[#FF5A36]/75" />
                            <div className="rounded bg-[#FF5A36]/75" />
                            <div className="rounded bg-[#FF5A36]/75" />
                          </div>
                        </div>
                      )}
                      {card.id === 'focus' && (
                        <>
                          <div className="flex-1 flex gap-1.5">
                            <div className="w-3 rounded bg-[#282E3D]" />
                            <div className="flex-1 rounded bg-[#1B202A]" />
                          </div>
                          <div className="h-2.5 rounded bg-[#FF5A36]/75" />
                        </>
                      )}
                      {card.id === 'mirrored' && (
                        <>
                          <div className="flex-1 flex gap-1.5">
                            <div className="w-7 rounded bg-[#282E3D]" />
                            <div className="flex-1 rounded bg-[#1B202A]" />
                            <div className="w-5 rounded bg-[#282E3D]" />
                          </div>
                          <div className="h-4 rounded bg-[#FF5A36]/75" />
                        </>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-[#F4F5F7] mb-1.5">{card.title}</h3>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed mb-4">{card.desc}</p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-[#FF5A36] group-hover:translate-x-0.5 transition-transform">
                    <span>Open in {card.title}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Export Formats & Quick-Start Presets */}
        <section id="exports" className="border-t border-[#202531] bg-[#13161D] py-20">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Export Pipeline List */}
            <div className="lg:col-span-7">
              <h2 className="text-2xl font-bold tracking-tight text-[#F4F5F7] mb-3">
                Ready for social loops and game engines
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-6 max-w-xl">
                Render transparent or solid-backdrop exports client-side with adjustable scale and
                column packing.
              </p>

              <div className="divide-y divide-[#242A36] border border-[#262C3A] rounded-xl bg-[#161920]">
                {EXPORT_FORMATS.map((item) => (
                  <div
                    key={item.format}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <span className="text-sm font-semibold text-[#F4F5F7]">{item.format}</span>
                    <span className="text-xs text-[#9CA3AF] sm:text-right">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick-Start Stage Launcher */}
            <div
              id="quickstart"
              className="lg:col-span-5 p-6 rounded-xl border border-[#262C3A] bg-[#181B23] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FF5A36] mb-2">
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Quick-Start Canvas</span>
                </div>
                <h3 className="text-xl font-bold text-[#F4F5F7] mb-2">
                  Platform animation screen sheets
                </h3>
                <p className="text-sm text-[#9CA3AF] mb-5">
                  Launch directly into a sized sheet with built-in UI safe-zone guides for YouTube,
                  TikTok, Reels, or 2D game sprites.
                </p>

                <div className="space-y-2 mb-6">
                  {[
                    {
                      name: 'YouTube 16:9 HD',
                      width: 1280,
                      height: 720,
                      fps: 24,
                      screenSheetId: 'youtube-hd',
                    },
                    {
                      name: 'TikTok Vertical 9:16',
                      width: 1080,
                      height: 1920,
                      fps: 30,
                      screenSheetId: 'tiktok-vertical',
                    },
                    {
                      name: 'YouTube Shorts 9:16',
                      width: 1080,
                      height: 1920,
                      fps: 30,
                      screenSheetId: 'youtube-shorts',
                    },
                    {
                      name: 'Instagram 4:5 Portrait',
                      width: 1080,
                      height: 1350,
                      fps: 15,
                      screenSheetId: 'instagram-portrait',
                    },
                    {
                      name: '2D Game Sprite 1:1',
                      width: 512,
                      height: 512,
                      fps: 12,
                      screenSheetId: 'game-sprite-tile',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.screenSheetId}
                      type="button"
                      onClick={() => onEnterStudio({ blankPreset: preset })}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#111318] hover:bg-[#1F2430] border border-[#2A303E] flex items-center justify-between text-xs transition-colors"
                    >
                      <span className="font-semibold text-[#F4F5F7]">{preset.name}</span>
                      <span className="font-mono text-[#9CA3AF] tabular-nums">
                        {preset.width}×{preset.height} · {preset.fps} FPS
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onEnterStudio()}
                className="w-full py-3 px-4 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>{hasSavedProjects ? 'Resume Active Project' : 'Open Studio Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#202531] bg-[#111318]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <div className="flex items-center gap-2 text-[#9CA3AF] font-semibold">
            <span>CelDraft</span>
            <span aria-hidden="true">·</span>
            <span className="font-normal text-[#6B7280]">Browser Frame-by-Frame Studio</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#capabilities" className="hover:text-[#D1D5DB] transition-colors">
              Capabilities
            </a>
            <a href="#layouts" className="hover:text-[#D1D5DB] transition-colors">
              Layouts
            </a>
            <a href="#exports" className="hover:text-[#D1D5DB] transition-colors">
              Exports
            </a>
            <button
              type="button"
              onClick={() => onEnterStudio()}
              className="text-[#FF5A36] hover:underline font-medium"
            >
              Open Studio
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
