import React, { useState } from 'react';
import { Check, Monitor, Plus, X } from 'lucide-react';
import { SCREEN_SHEET_PRESETS, ScreenSheetPreset } from '../utils/screenSheets';

interface ScreenSheetsModalProps {
  currentWidth: number;
  currentHeight: number;
  currentScreenSheetId?: string;
  onApplyToCurrent: (preset: ScreenSheetPreset) => void;
  onCreateNewFromSheet: (preset: ScreenSheetPreset) => void;
  onClose: () => void;
}

const PLATFORMS: Array<'All' | ScreenSheetPreset['platform']> = [
  'All',
  'YouTube',
  'TikTok',
  'Instagram',
  'Cinema & TV',
  'Game Dev',
];

export const ScreenSheetsModal: React.FC<ScreenSheetsModalProps> = ({
  currentWidth,
  currentHeight,
  currentScreenSheetId,
  onApplyToCurrent,
  onCreateNewFromSheet,
  onClose,
}) => {
  const [platformFilter, setPlatformFilter] = useState<'All' | ScreenSheetPreset['platform']>('All');

  const filtered =
    platformFilter === 'All'
      ? SCREEN_SHEET_PRESETS
      : SCREEN_SHEET_PRESETS.filter((p) => p.platform === platformFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#181B23] border border-[#2D3444] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#262B36] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-4 h-4 text-[#FF5A36]" />
            <div>
              <h2 className="text-sm font-bold text-[#F4F5F7]">Animation Screen Sheets</h2>
              <p className="text-xs text-[#9CA3AF]">
                Platform canvas sizes, frame rates, and UI safe-zone guides for YouTube, TikTok,
                and more.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#252A36]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform Filter Bar */}
        <div className="px-5 py-3 border-b border-[#232834] bg-[#14171E] flex items-center gap-1.5 overflow-x-auto">
          {PLATFORMS.map((plat) => (
            <button
              key={plat}
              type="button"
              onClick={() => setPlatformFilter(plat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                platformFilter === plat
                  ? 'bg-[#FF5A36] text-white'
                  : 'bg-[#1D212A] text-[#9CA3AF] hover:text-[#F4F5F7]'
              }`}
            >
              {plat}
            </button>
          ))}
        </div>

        {/* Sheets Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((preset) => {
            const isActive =
              currentScreenSheetId === preset.id ||
              (!currentScreenSheetId &&
                currentWidth === preset.width &&
                currentHeight === preset.height);

            // Compute proportional preview box inside 120x88 stage frame
            const maxW = 112;
            const maxH = 80;
            const scale = Math.min(maxW / preset.width, maxH / preset.height);
            const boxW = Math.max(24, Math.round(preset.width * scale));
            const boxH = Math.max(24, Math.round(preset.height * scale));

            return (
              <div
                key={preset.id}
                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-colors ${
                  isActive
                    ? 'bg-[#212633] border-[#FF5A36]'
                    : 'bg-[#1C2029] border-[#29303E] hover:border-[#3C465A]'
                }`}
              >
                <div>
                  {/* Proportional Aspect Preview with Safe Zone Frame */}
                  <div className="h-24 rounded-lg bg-[#111318] border border-[#242A36] flex items-center justify-center mb-3">
                    <div
                      className="relative bg-[#FAF9F6] rounded-[3px] shadow-md overflow-hidden"
                      style={{ width: boxW, height: boxH }}
                    >
                      {/* Safe Zone Inner Frame */}
                      <div
                        className="absolute border border-dashed border-[#FF5A36] bg-[#38BDF8]/10"
                        style={{
                          top: `${preset.safeZone.topPct * 100}%`,
                          right: `${preset.safeZone.rightPct * 100}%`,
                          bottom: `${preset.safeZone.bottomPct * 100}%`,
                          left: `${preset.safeZone.leftPct * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Sheet Details */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-medium text-[#38BDF8]">
                      {preset.platform} · {preset.ratioLabel}
                    </span>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#FF5A36]">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-bold text-[#F4F5F7] mb-1">{preset.name}</div>
                  <div className="font-mono text-xs text-[#9CA3AF] tabular-nums mb-1.5">
                    {preset.width}×{preset.height} · {preset.fps} FPS
                  </div>
                  <p className="text-[11px] text-[#7B8498] leading-snug mb-3">
                    {preset.safeZone.note}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#262C3A]">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyToCurrent(preset);
                      onClose();
                    }}
                    className="py-1.5 px-2 rounded-md bg-[#262C3A] hover:bg-[#323A4D] text-[11px] font-semibold text-[#F4F5F7] transition-colors whitespace-nowrap"
                  >
                    Apply Size
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateNewFromSheet(preset);
                      onClose();
                    }}
                    className="py-1.5 px-2 rounded-md bg-[#FF5A36] hover:bg-[#FF6E4E] text-[11px] font-semibold text-white flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Sheet</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
