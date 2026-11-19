export type ToolType =
  | 'pen'
  | 'eraser'
  | 'fill'
  | 'select'
  | 'shape'
  | 'text'
  | 'eyedropper'
  | 'pan';

export type WorkspaceLayout = 'studio' | 'mirrored' | 'storyboard' | 'focus';

export type BrushPreset = 'ink' | 'pencil' | 'marker' | 'spray';

export type ShapeKind = 'line' | 'rect' | 'ellipse';

export type BlendMode = 'source-over' | 'multiply' | 'screen';

export type VisemeType = 'X' | 'MBP' | 'EI' | 'AO' | 'AA';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
}

export interface FrameData {
  id: string;
  /** Map of layerId -> PNG Data URL (or empty string if blank) */
  cels: Record<string, string>;
  /** Optional lip-sync viseme assigned to this frame */
  viseme?: VisemeType;
  /** Optional hold multiplier (1 = normal 1 frame) */
  hold?: number;
}

export interface OnionSkinSettings {
  enabled: boolean;
  prevFrames: number; // 0..3
  nextFrames: number; // 0..3
  opacity: number; // 0.05..0.6
  tintColors: boolean;
}

export interface AudioTrackData {
  id: string;
  name: string;
  duration: number; // seconds
  sampleRate: number;
  /** Base64 encoded audio file or WAV blob data URL for persistence */
  dataUrl: string;
  /** Precomputed normalized peaks (0..1) for waveform rendering */
  peaks: number[];
  muted: boolean;
  volume: number; // 0..1
}

export interface AnimationProject {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  backgroundColor: string; // hex or 'transparent'
  screenSheetId?: string;
  layers: Layer[];
  frames: FrameData[];
  onionSkin: OnionSkinSettings;
  audio: AudioTrackData | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  thumbnailUrl: string;
  updatedAt: number;
}

export interface BrushSettings {
  preset: BrushPreset;
  size: number;
  opacity: number;
  color: string;
  smoothing: number; // 0..1
}

export interface ShapeSettings {
  kind: ShapeKind;
  filled: boolean;
  strokeWidth: number;
}

export interface HistorySnapshot {
  layers: Layer[];
  frames: FrameData[];
  currentFrameIndex: number;
  activeLayerId: string;
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  imageDataUrl: string;
  flipX?: boolean;
  flipY?: boolean;
}
