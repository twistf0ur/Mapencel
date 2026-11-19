import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CopyPlus,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Merge,
  Mic,
  Music,
  Plus,
  Sliders,
  Trash2,
  Unlock,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import {
  AudioTrackData,
  BlendMode,
  Layer,
  OnionSkinSettings,
  VisemeType,
} from '../types/animation';
import { SCREEN_SHEET_PRESETS, findMatchingScreenSheet, findScreenSheetById } from '../utils/screenSheets';

interface RightInspectorProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onUpdateLayer: (id: string, patch: Partial<Layer>) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onMergeLayerDown: (id: string) => void;

  // Audio & Lip Sync
  audio: AudioTrackData | null;
  onUploadAudio: (file: File) => void;
  onGenerateDemoAudio: () => void;
  onUpdateAudio: (patch: Partial<AudioTrackData>) => void;
  onRemoveAudio: () => void;
  currentViseme?: VisemeType;
  onAutoLipSync: (mouthX: number, mouthY: number, mouthScale: number) => void;
  onAssignFrameViseme: (viseme: VisemeType, mouthX: number, mouthY: number, mouthScale: number) => void;

  // Stage & Onion Skin
  width: number;
  height: number;
  backgroundColor: string;
  screenSheetId?: string;
  showSafeZones?: boolean;
  onToggleSafeZones?: () => void;
  onOpenSheets?: () => void;
  onChangeStage: (patch: { width?: number; height?: number; backgroundColor?: string; screenSheetId?: string; fps?: number }) => void;
  onionSkin: OnionSkinSettings;
  onChangeOnionSkin: (patch: Partial<OnionSkinSettings>) => void;
  side?: 'left' | 'right';
  className?: string;
}

const VISEMES: { id: VisemeType; label: string; desc: string }[] = [
  { id: 'X', label: 'Rest', desc: 'Closed smile' },
  { id: 'MBP', label: 'M / B / P', desc: 'Pressed lips' },
  { id: 'EI', label: 'E / I', desc: 'Wide teeth' },
  { id: 'AO', label: 'O / U', desc: 'Rounded O' },
  { id: 'AA', label: 'A / AH', desc: 'Wide open' },
];

export const RightInspector: React.FC<RightInspectorProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onUpdateLayer,
  onMoveLayer,
  onMergeLayerDown,
  audio,
  onUploadAudio,
  onGenerateDemoAudio,
  onUpdateAudio,
  onRemoveAudio,
  currentViseme,
  onAutoLipSync,
  onAssignFrameViseme,
  width,
  height,
  backgroundColor,
  screenSheetId,
  showSafeZones = false,
  onToggleSafeZones,
  onOpenSheets,
  onChangeStage,
  onionSkin,
  onChangeOnionSkin,
  side = 'right',
  className = '',
}) => {
  const [tab, setTab] = useState<'layers' | 'lipsync' | 'stage'>('layers');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [mouthX, setMouthX] = useState<number>(Math.round(width / 2));
  const [mouthY, setMouthY] = useState<number>(Math.round(height * 0.62));
  const [mouthScale, setMouthScale] = useState<number>(1.0);
  const [stageWInput, setStageWInput] = useState<string>(String(width));
  const [stageHInput, setStageHInput] = useState<string>(String(height));
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStageWInput(String(width));
  }, [width]);

  useEffect(() => {
    setStageHInput(String(height));
  }, [height]);

  const commitStageDimensions = (nextWStr: string, nextHStr: string) => {
    const parsedW = Math.max(128, Math.min(3840, Math.round(Number(nextWStr) || width)));
    const parsedH = Math.max(128, Math.min(3840, Math.round(Number(nextHStr) || height)));
    setStageWInput(String(parsedW));
    setStageHInput(String(parsedH));
    if (parsedW !== width || parsedH !== height) {
      const matched = findMatchingScreenSheet(parsedW, parsedH);
      onChangeStage({
        width: parsedW,
        height: parsedH,
        screenSheetId: matched?.id,
      });
    }
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  // Display layers top-to-bottom (last element is top-most)
  const layersTopDown = [...layers].reverse();

  return (
    <aside
      className={`w-68 bg-[#161920] ${
        side === 'left' ? 'border-r border-[#262B36]' : 'border-l border-[#262B36]'
      } flex flex-col h-full shrink-0 select-none z-10 ${className}`}
    >
      {/* Segmented Panel Tabs */}
      <div className="p-2 border-b border-[#262B36]">
        <div className="grid grid-cols-3 gap-1 bg-[#111318] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('layers')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              tab === 'layers'
                ? 'bg-[#252A36] text-[#F4F5F7]'
                : 'text-[#8B93A5] hover:text-[#D1D5DB]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('lipsync')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              tab === 'lipsync'
                ? 'bg-[#252A36] text-[#F4F5F7]'
                : 'text-[#8B93A5] hover:text-[#D1D5DB]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Lip Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('stage')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              tab === 'stage'
                ? 'bg-[#252A36] text-[#F4F5F7]'
                : 'text-[#8B93A5] hover:text-[#D1D5DB]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Stage</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LAYERS */}
      {tab === 'layers' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Layer Toolbar */}
          <div className="px-3 py-2 border-b border-[#262B36] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#D1D5DB]">
              Layers ({layers.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onAddLayer}
                title="New Layer"
                className="p-1.5 rounded-md bg-[#FF5A36] hover:bg-[#FF6E4E] text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {activeLayer && (
                <>
                  <button
                    type="button"
                    onClick={() => onDuplicateLayer(activeLayer.id)}
                    title="Duplicate Layer"
                    className="p-1.5 rounded-md bg-[#20242E] hover:bg-[#2A303E] text-[#D1D5DB]"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMergeLayerDown(activeLayer.id)}
                    disabled={layers.findIndex((l) => l.id === activeLayer.id) === 0}
                    title="Merge Layer Down"
                    className="p-1.5 rounded-md bg-[#20242E] hover:bg-[#2A303E] text-[#D1D5DB] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Merge className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteLayer(activeLayer.id)}
                    disabled={layers.length <= 1}
                    title="Delete Layer"
                    className="p-1.5 rounded-md bg-[#20242E] hover:bg-[#F43F5E]/20 text-[#9CA3AF] hover:text-[#F43F5E] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Active Layer Opacity & Blend Mode */}
          {activeLayer && (
            <div className="px-3 py-2.5 border-b border-[#262B36] bg-[#191D26] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] text-[#9CA3AF] font-medium">Blend</label>
                <select
                  value={activeLayer.blendMode}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.id, { blendMode: e.target.value as BlendMode })
                  }
                  className="bg-[#111318] border border-[#2C3240] rounded-md px-2 py-1 text-xs text-[#F4F5F7] w-32"
                >
                  <option value="source-over">Normal</option>
                  <option value="multiply">Multiply</option>
                  <option value="screen">Screen</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#9CA3AF] font-medium">Layer Opacity</span>
                  <span className="font-mono text-[#F4F5F7] tabular-nums">
                    {Math.round(activeLayer.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(activeLayer.opacity * 100)}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.id, { opacity: Number(e.target.value) / 100 })
                  }
                  className="w-full studio-slider"
                />
              </div>
            </div>
          )}

          {/* Layer Stack List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {layersTopDown.map((layer) => {
              const isActive = layer.id === activeLayerId;
              const origIndex = layers.findIndex((l) => l.id === layer.id);
              const isTop = origIndex === layers.length - 1;
              const isBottom = origIndex === 0;

              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`group flex items-center gap-1.5 px-2 py-2 rounded-lg border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#232836] border-[#FF5A36]/60'
                      : 'bg-[#1B1F28] border-transparent hover:border-[#2C3240]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateLayer(layer.id, { visible: !layer.visible });
                    }}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    className={`p-1 rounded ${
                      layer.visible ? 'text-[#D1D5DB]' : 'text-[#5A6377]'
                    } hover:bg-[#2E3444]`}
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {editingLayerId === layer.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={layer.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateLayer(layer.id, { name: e.target.value })}
                        onBlur={() => setEditingLayerId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingLayerId(null);
                        }}
                        className="w-full bg-[#111318] border border-[#FF5A36] rounded px-1.5 py-0.5 text-xs text-white"
                      />
                    ) : (
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingLayerId(layer.id);
                        }}
                        className={`text-xs font-medium truncate ${
                          isActive ? 'text-[#F4F5F7]' : 'text-[#C7CDD8]'
                        }`}
                        title="Double-click to rename"
                      >
                        {layer.name}
                      </div>
                    )}
                    <div className="text-[10px] text-[#6B7280] font-mono tabular-nums">
                      {Math.round(layer.opacity * 100)}%
                      {layer.blendMode !== 'source-over' ? ` · ${layer.blendMode}` : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateLayer(layer.id, { locked: !layer.locked });
                    }}
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    className={`p-1 rounded ${
                      layer.locked
                        ? 'text-[#F59E0B]'
                        : 'text-[#5A6377] opacity-0 group-hover:opacity-100'
                    } hover:bg-[#2E3444]`}
                  >
                    {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={isTop}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(layer.id, 'up');
                      }}
                      title="Move Up"
                      className="p-0.5 text-[#9CA3AF] hover:text-white disabled:opacity-25"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isBottom}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(layer.id, 'down');
                      }}
                      title="Move Down"
                      className="p-0.5 text-[#9CA3AF] hover:text-white disabled:opacity-25"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AUDIO & LIP SYNC */}
      {tab === 'lipsync' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Audio Import Card */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#F4F5F7]">Audio Track</div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadAudio(file);
                e.target.value = '';
              }}
            />

            {!audio ? (
              <div className="bg-[#1B1F28] border border-[#282D3A] rounded-lg p-3 space-y-2.5">
                <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                  Import voice or music to scrub along the timeline and auto-generate mouth animation.
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-md bg-[#282D3A] hover:bg-[#323848] text-xs font-semibold text-[#F4F5F7] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Music className="w-3.5 h-3.5 text-[#FF5A36]" />
                    <span>Import Audio File</span>
                  </button>
                  <button
                    type="button"
                    onClick={onGenerateDemoAudio}
                    className="w-full py-1.5 px-3 rounded-md bg-[#111318] hover:bg-[#20242D] border border-[#2A303E] text-[11px] font-medium text-[#D1D5DB] transition-colors"
                  >
                    Load Demo Voice Clip
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#1B1F28] border border-[#282D3A] rounded-lg p-2.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#F4F5F7] truncate">{audio.name}</div>
                    <div className="text-[10px] font-mono text-[#9CA3AF] tabular-nums">
                      {audio.duration.toFixed(2)}s
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateAudio({ muted: !audio.muted })}
                      title={audio.muted ? 'Unmute' : 'Mute'}
                      className="p-1.5 rounded bg-[#242935] text-[#D1D5DB] hover:text-white"
                    >
                      {audio.muted ? (
                        <VolumeX className="w-3.5 h-3.5 text-[#F43F5E]" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-[#10B981]" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onRemoveAudio}
                      title="Remove Audio"
                      className="p-1.5 rounded bg-[#242935] text-[#9CA3AF] hover:text-[#F43F5E]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#9CA3AF]">Volume</span>
                    <span className="font-mono text-[#F4F5F7] tabular-nums">
                      {Math.round(audio.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(audio.volume * 100)}
                    onChange={(e) => onUpdateAudio({ volume: Number(e.target.value) / 100 })}
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lip Sync Generator */}
          <div className="pt-3 border-t border-[#262B36] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F4F5F7]">Mouth Rig Placement</span>
              <button
                type="button"
                onClick={() => {
                  setMouthX(Math.round(width / 2));
                  setMouthY(Math.round(height * 0.62));
                  setMouthScale(1);
                }}
                className="text-[10px] text-[#38BDF8] hover:underline"
              >
                Center
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#9CA3AF] mb-1">X Position</label>
                <input
                  type="number"
                  value={mouthX}
                  onChange={(e) => setMouthX(Number(e.target.value) || 0)}
                  className="w-full bg-[#111318] border border-[#2A303E] rounded px-2 py-1 text-xs font-mono tabular-nums text-[#F4F5F7]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#9CA3AF] mb-1">Y Position</label>
                <input
                  type="number"
                  value={mouthY}
                  onChange={(e) => setMouthY(Number(e.target.value) || 0)}
                  className="w-full bg-[#111318] border border-[#2A303E] rounded px-2 py-1 text-xs font-mono tabular-nums text-[#F4F5F7]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#9CA3AF]">Mouth Scale</span>
                <span className="font-mono text-[#F4F5F7] tabular-nums">{mouthScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                value={Math.round(mouthScale * 10)}
                onChange={(e) => setMouthScale(Number(e.target.value) / 10)}
                className="w-full studio-slider"
              />
            </div>

            <button
              type="button"
              disabled={!audio}
              onClick={() => onAutoLipSync(mouthX, mouthY, mouthScale)}
              className="w-full py-2 px-3 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto-Sync Mouths to Audio</span>
            </button>

            {/* Manual Frame Viseme Picker */}
            <div className="pt-2 border-t border-[#262B36]">
              <div className="text-[11px] font-medium text-[#9CA3AF] mb-2">
                Stamp Viseme on Current Frame
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {VISEMES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onAssignFrameViseme(v.id, mouthX, mouthY, mouthScale)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-left transition-colors ${
                      currentViseme === v.id
                        ? 'bg-[#282D3A] border-[#FF5A36]/70 text-[#F4F5F7]'
                        : 'bg-[#1B1F28] border-[#262B36] text-[#C7CDD8] hover:border-[#3A4152]'
                    }`}
                  >
                    <span className="text-xs font-semibold">{v.label}</span>
                    <span className="text-[10px] text-[#8B93A5]">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STAGE & ONION SKIN */}
      {tab === 'stage' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Onion Skin Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F4F5F7]">Onion Skinning</span>
              <button
                type="button"
                onClick={() => onChangeOnionSkin({ enabled: !onionSkin.enabled })}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  onionSkin.enabled
                    ? 'bg-[#38BDF8]/20 text-[#38BDF8]'
                    : 'bg-[#232834] text-[#9CA3AF]'
                }`}
              >
                {onionSkin.enabled ? 'Enabled' : 'Off'}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#F43F5E]">Before Frames</span>
                <span className="font-mono text-[#F4F5F7] tabular-nums">{onionSkin.prevFrames}</span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                value={onionSkin.prevFrames}
                onChange={(e) => onChangeOnionSkin({ prevFrames: Number(e.target.value) })}
                className="w-full studio-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#38BDF8]">After Frames</span>
                <span className="font-mono text-[#F4F5F7] tabular-nums">{onionSkin.nextFrames}</span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                value={onionSkin.nextFrames}
                onChange={(e) => onChangeOnionSkin({ nextFrames: Number(e.target.value) })}
                className="w-full studio-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#9CA3AF]">Ghost Opacity</span>
                <span className="font-mono text-[#F4F5F7] tabular-nums">
                  {Math.round(onionSkin.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={65}
                value={Math.round(onionSkin.opacity * 100)}
                onChange={(e) => onChangeOnionSkin({ opacity: Number(e.target.value) / 100 })}
                className="w-full studio-slider"
              />
            </div>

            <label className="flex items-center justify-between text-xs text-[#D1D5DB] cursor-pointer">
              <span>Tint Before / After Colors</span>
              <input
                type="checkbox"
                checked={onionSkin.tintColors}
                onChange={(e) => onChangeOnionSkin({ tintColors: e.target.checked })}
                className="accent-[#FF5A36]"
              />
            </label>
          </div>

          {/* Stage Size & Paper */}
          <div className="pt-4 border-t border-[#262B36] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F4F5F7]">Screen Sheet</span>
              {onOpenSheets && (
                <button
                  type="button"
                  onClick={onOpenSheets}
                  className="text-[11px] font-medium text-[#FF5A36] hover:underline"
                >
                  Browse All
                </button>
              )}
            </div>
            <div>
              <label className="block text-[11px] text-[#9CA3AF] mb-1">Platform & Aspect Ratio</label>
              <select
                value={
                  findScreenSheetById(screenSheetId)?.id ||
                  findMatchingScreenSheet(width, height)?.id ||
                  'custom'
                }
                onChange={(e) => {
                  const chosen = SCREEN_SHEET_PRESETS.find((p) => p.id === e.target.value);
                  if (chosen) {
                    onChangeStage({
                      width: chosen.width,
                      height: chosen.height,
                      fps: chosen.fps,
                      screenSheetId: chosen.id,
                    });
                  }
                }}
                className="w-full bg-[#111318] border border-[#2C3240] rounded-md px-2.5 py-1.5 text-xs text-[#F4F5F7]"
              >
                {SCREEN_SHEET_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.width}×{p.height})
                  </option>
                ))}
                <option value="custom" disabled>
                  Custom ({width}×{height})
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">Width (px)</label>
                <input
                  type="number"
                  min={128}
                  max={3840}
                  value={stageWInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStageWInput(val);
                    const n = Number(val);
                    if (Number.isFinite(n) && n >= 128 && n <= 3840) {
                      onChangeStage({ width: Math.round(n), screenSheetId: undefined });
                    }
                  }}
                  onBlur={() => commitStageDimensions(stageWInput, stageHInput)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitStageDimensions(stageWInput, stageHInput);
                  }}
                  className="w-full bg-[#111318] border border-[#2C3240] focus:border-[#FF5A36] rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-[#F4F5F7] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">Height (px)</label>
                <input
                  type="number"
                  min={128}
                  max={3840}
                  value={stageHInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStageHInput(val);
                    const n = Number(val);
                    if (Number.isFinite(n) && n >= 128 && n <= 3840) {
                      onChangeStage({ height: Math.round(n), screenSheetId: undefined });
                    }
                  }}
                  onBlur={() => commitStageDimensions(stageWInput, stageHInput)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitStageDimensions(stageWInput, stageHInput);
                  }}
                  className="w-full bg-[#111318] border border-[#2C3240] focus:border-[#FF5A36] rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-[#F4F5F7] outline-none"
                />
              </div>
            </div>

            {onToggleSafeZones && (
              <label className="flex items-center justify-between text-xs text-[#D1D5DB] cursor-pointer">
                <span>Platform Safe-Zone Guides</span>
                <input
                  type="checkbox"
                  checked={showSafeZones}
                  onChange={onToggleSafeZones}
                  className="accent-[#FF5A36]"
                />
              </label>
            )}

            <div>
              <label className="block text-[11px] text-[#9CA3AF] mb-1.5">Paper Background</label>
              <div className="flex items-center gap-2">
                {['#FAF9F6', '#FFFFFF', '#18181B', '#0F172A', 'transparent'].map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => onChangeStage({ backgroundColor: bg })}
                    title={bg === 'transparent' ? 'Transparent' : bg}
                    className={`w-7 h-7 rounded-md border transition-transform hover:scale-105 ${
                      bg === 'transparent' ? 'checkerboard-bg' : ''
                    } ${
                      backgroundColor === bg
                        ? 'border-[#FF5A36] ring-1 ring-[#FF5A36]'
                        : 'border-[#343B4C]'
                    }`}
                    style={bg !== 'transparent' ? { backgroundColor: bg } : undefined}
                  />
                ))}
                <input
                  type="color"
                  value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                  onChange={(e) => onChangeStage({ backgroundColor: e.target.value })}
                  title="Custom Paper Color"
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border border-[#343B4C]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
