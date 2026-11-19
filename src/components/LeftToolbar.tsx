import React, { useState } from 'react';
import {
  BoxSelect,
  Circle,
  Eraser,
  Hand,
  Minus,
  PaintBucket,
  PenTool,
  Pipette,
  Shapes,
  SlidersHorizontal,
  Square,
  Type,
} from 'lucide-react';
import {
  BrushPreset,
  BrushSettings,
  ShapeKind,
  ShapeSettings,
  ToolType,
} from '../types/animation';

interface LeftToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  brush: BrushSettings;
  onChangeBrush: (next: Partial<BrushSettings>) => void;
  shape: ShapeSettings;
  onChangeShape: (next: Partial<ShapeSettings>) => void;
  recentColors: string[];
  compact?: boolean;
  side?: 'left' | 'right';
}

const STUDIO_SWATCHES = [
  '#1E293B',
  '#FFFFFF',
  '#FF5A36',
  '#F59E0B',
  '#10B981',
  '#38BDF8',
  '#6366F1',
  '#EC4899',
];

const TOOLS: { id: ToolType; label: string; shortcut: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'pen', label: 'Brush', shortcut: 'B', icon: PenTool },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
  { id: 'fill', label: 'Bucket Fill', shortcut: 'F', icon: PaintBucket },
  { id: 'select', label: 'Select & Transform', shortcut: 'S', icon: BoxSelect },
  { id: 'shape', label: 'Shapes', shortcut: 'U', icon: Shapes },
  { id: 'text', label: 'Text Stamp', shortcut: 'T', icon: Type },
  { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I', icon: Pipette },
  { id: 'pan', label: 'Pan Stage', shortcut: 'H', icon: Hand },
];

const BRUSH_PRESETS: { id: BrushPreset; label: string }[] = [
  { id: 'ink', label: 'Ink' },
  { id: 'pencil', label: 'Pencil' },
  { id: 'marker', label: 'Marker' },
  { id: 'spray', label: 'Spray' },
];

const SHAPE_KINDS: { id: ShapeKind; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
];

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  activeTool,
  onSelectTool,
  brush,
  onChangeBrush,
  shape,
  onChangeShape,
  recentColors,
  compact = false,
  side = 'left',
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const showBrushOptions = activeTool === 'pen' || activeTool === 'eraser';
  const showShapeOptions = activeTool === 'shape';

  const settingsContent = (
    <div className="flex flex-col gap-4">
      {showBrushOptions && (
        <>
          <div>
            <div className="text-[11px] font-semibold text-[#9CA3AF] mb-2">
              {activeTool === 'eraser' ? 'Eraser Settings' : 'Brush Preset'}
            </div>
            {activeTool === 'pen' && (
              <div className="grid grid-cols-2 gap-1">
                {BRUSH_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChangeBrush({ preset: preset.id })}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      brush.preset === preset.id
                        ? 'bg-[#2A303E] text-[#F4F5F7] border border-[#FF5A36]/60'
                        : 'bg-[#20242D] text-[#9CA3AF] hover:text-[#F4F5F7] border border-transparent'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#9CA3AF] font-medium">Size</span>
              <span className="font-mono text-[#F4F5F7] tabular-nums">{brush.size}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={80}
              value={brush.size}
              onChange={(e) => onChangeBrush({ size: Number(e.target.value) })}
              className="w-full studio-slider"
            />
            <div className="mt-2.5 h-10 rounded-md bg-[#12141A] border border-[#262B36] flex items-center justify-center">
              <div
                className="rounded-full transition-all"
                style={{
                  width: Math.min(34, Math.max(3, brush.size)),
                  height: Math.min(34, Math.max(3, brush.size)),
                  backgroundColor: activeTool === 'eraser' ? '#9CA3AF' : brush.color,
                  opacity: brush.opacity,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#9CA3AF] font-medium">Opacity</span>
              <span className="font-mono text-[#F4F5F7] tabular-nums">
                {Math.round(brush.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(brush.opacity * 100)}
              onChange={(e) => onChangeBrush({ opacity: Number(e.target.value) / 100 })}
              className="w-full studio-slider"
            />
          </div>
        </>
      )}

      {showShapeOptions && (
        <>
          <div>
            <div className="text-[11px] font-semibold text-[#9CA3AF] mb-2">Shape Tool</div>
            <div className="grid grid-cols-3 gap-1">
              {SHAPE_KINDS.map((kind) => {
                const Icon = kind.icon;
                return (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => onChangeShape({ kind: kind.id })}
                    title={kind.label}
                    className={`py-2 rounded-md flex items-center justify-center transition-colors ${
                      shape.kind === kind.id
                        ? 'bg-[#2A303E] text-[#FF5A36] border border-[#FF5A36]/50'
                        : 'bg-[#20242D] text-[#9CA3AF] hover:text-[#F4F5F7] border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {shape.kind !== 'line' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF] font-medium">Fill Mode</span>
              <button
                type="button"
                onClick={() => onChangeShape({ filled: !shape.filled })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  shape.filled
                    ? 'bg-[#FF5A36]/20 text-[#FF5A36] border border-[#FF5A36]/40'
                    : 'bg-[#20242D] text-[#D1D5DB] border border-[#2E3443]'
                }`}
              >
                {shape.filled ? 'Filled' : 'Outline'}
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#9CA3AF] font-medium">Stroke</span>
              <span className="font-mono text-[#F4F5F7] tabular-nums">{shape.strokeWidth}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              value={shape.strokeWidth}
              onChange={(e) => onChangeShape({ strokeWidth: Number(e.target.value) })}
              className="w-full studio-slider"
            />
          </div>
        </>
      )}

      {!showBrushOptions && !showShapeOptions && (
        <div className="text-xs text-[#9CA3AF] leading-relaxed bg-[#1E222B] p-2.5 rounded-lg border border-[#282D3A]">
          {activeTool === 'fill' && 'Click inside any enclosed region on the active layer to fill with color.'}
          {activeTool === 'select' &&
            'Drag a box around artwork to move, resize, flip, or delete it.'}
          {activeTool === 'text' && 'Click anywhere on the canvas to type and stamp text onto the active layer.'}
          {activeTool === 'eyedropper' && 'Click any pixel on the stage to sample its color.'}
          {activeTool === 'pan' && 'Drag the canvas to pan around the stage. Scroll wheel to zoom.'}
        </div>
      )}

      {/* Color Palette Section */}
      <div className="pt-3 border-t border-[#262B36]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#9CA3AF]">Palette</span>
          <span className="font-mono text-[10px] text-[#6B7280] uppercase">{brush.color}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {STUDIO_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => onChangeBrush({ color: swatch })}
              title={swatch}
              className={`h-7 rounded-md border transition-transform hover:scale-105 ${
                brush.color.toLowerCase() === swatch.toLowerCase()
                  ? 'border-[#FF5A36] ring-1 ring-[#FF5A36]'
                  : 'border-[#2E3443]'
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>

        {recentColors.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] text-[#6B7280] mb-1.5">Recent</div>
            <div className="flex flex-wrap gap-1.5">
              {recentColors.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChangeBrush({ color: c })}
                  title={c}
                  className="w-5 h-5 rounded border border-[#2E3443] hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const rail = (
    <div
      className={`w-13 bg-[#161920] flex flex-col items-center py-2.5 gap-1.5 ${
        side === 'left' ? 'border-r border-[#262B36]' : 'border-l border-[#262B36]'
      }`}
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-[#FF5A36] text-white'
                : 'text-[#9CA3AF] hover:text-[#F4F5F7] hover:bg-[#232834]'
            }`}
          >
            <Icon className="w-4.5 h-4.5" />
          </button>
        );
      })}

      {compact && (
        <button
          type="button"
          onClick={() => setPopoverOpen((o) => !o)}
          title="Tool & Brush Settings"
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            popoverOpen
              ? 'bg-[#2A303E] text-[#FF5A36] border border-[#FF5A36]/50'
              : 'text-[#9CA3AF] hover:text-[#F4F5F7] hover:bg-[#232834]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      )}

      {/* Active Color Swatch Indicator at Bottom of Rail */}
      <div className="mt-auto pt-3 border-t border-[#262B36] flex flex-col items-center gap-2">
        <label
          title="Pick Color"
          className="relative w-8 h-8 rounded-lg border-2 border-[#3A4152] cursor-pointer overflow-hidden shadow-inner block"
          style={{ backgroundColor: brush.color }}
        >
          <input
            type="color"
            value={brush.color}
            onChange={(e) => onChangeBrush({ color: e.target.value })}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            aria-label="Brush color picker"
          />
        </label>
      </div>
    </div>
  );

  const drawer = !compact ? (
    <div
      className={`w-44 bg-[#181B23] p-3 overflow-y-auto ${
        side === 'left' ? 'border-r border-[#262B36]' : 'border-l border-[#262B36]'
      }`}
    >
      {settingsContent}
    </div>
  ) : popoverOpen ? (
    <div
      className={`absolute top-2 ${
        side === 'left' ? 'left-15' : 'right-15'
      } z-40 w-52 bg-[#181B23] border border-[#2E3545] rounded-xl shadow-2xl p-3 max-h-[80vh] overflow-y-auto`}
    >
      {settingsContent}
    </div>
  ) : null;

  return (
    <aside className="relative flex h-full shrink-0 select-none z-10">
      {side === 'left' ? (
        <>
          {rail}
          {drawer}
        </>
      ) : (
        <>
          {drawer}
          {rail}
        </>
      )}
    </aside>
  );
};
