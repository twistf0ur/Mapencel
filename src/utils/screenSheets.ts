export interface SafeZoneMargins {
  topPct: number;
  rightPct: number;
  bottomPct: number;
  leftPct: number;
  note: string;
}

export interface ScreenSheetPreset {
  id: string;
  platform: 'YouTube' | 'TikTok' | 'Instagram' | 'Cinema & TV' | 'Game Dev';
  name: string;
  ratioLabel: string;
  width: number;
  height: number;
  fps: number;
  safeZone: SafeZoneMargins;
}

export const SCREEN_SHEET_PRESETS: ScreenSheetPreset[] = [
  {
    id: 'youtube-hd',
    platform: 'YouTube',
    name: 'YouTube 16:9 HD',
    ratioLabel: '16:9',
    width: 1280,
    height: 720,
    fps: 24,
    safeZone: {
      topPct: 0.05,
      rightPct: 0.05,
      bottomPct: 0.12,
      leftPct: 0.05,
      note: 'Bottom scrub bar & title-safe margin',
    },
  },
  {
    id: 'youtube-fhd',
    platform: 'YouTube',
    name: 'YouTube 1080p Full HD',
    ratioLabel: '16:9',
    width: 1920,
    height: 1080,
    fps: 24,
    safeZone: {
      topPct: 0.05,
      rightPct: 0.05,
      bottomPct: 0.12,
      leftPct: 0.05,
      note: '1080p player controls & end-screen safe zone',
    },
  },
  {
    id: 'youtube-shorts',
    platform: 'YouTube',
    name: 'YouTube Shorts',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    safeZone: {
      topPct: 0.1,
      rightPct: 0.16,
      bottomPct: 0.22,
      leftPct: 0.06,
      note: 'Right action icons & bottom channel title area',
    },
  },
  {
    id: 'tiktok-vertical',
    platform: 'TikTok',
    name: 'TikTok Vertical',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    safeZone: {
      topPct: 0.12,
      rightPct: 0.18,
      bottomPct: 0.24,
      leftPct: 0.06,
      note: 'Top tabs, right engagement rail & bottom caption overlay',
    },
  },
  {
    id: 'tiktok-draft-720',
    platform: 'TikTok',
    name: 'TikTok Fast Draft',
    ratioLabel: '9:16',
    width: 720,
    height: 1280,
    fps: 24,
    safeZone: {
      topPct: 0.12,
      rightPct: 0.18,
      bottomPct: 0.24,
      leftPct: 0.06,
      note: 'Lightweight 720p vertical canvas with TikTok UI guides',
    },
  },
  {
    id: 'instagram-reels',
    platform: 'Instagram',
    name: 'Instagram Reels',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    safeZone: {
      topPct: 0.1,
      rightPct: 0.16,
      bottomPct: 0.23,
      leftPct: 0.06,
      note: 'Reels handle, audio ticker & right icons',
    },
  },
  {
    id: 'instagram-portrait',
    platform: 'Instagram',
    name: 'Instagram Feed Portrait',
    ratioLabel: '4:5',
    width: 1080,
    height: 1350,
    fps: 15,
    safeZone: {
      topPct: 0.05,
      rightPct: 0.05,
      bottomPct: 0.08,
      leftPct: 0.05,
      note: '4:5 feed card perimeter margin',
    },
  },
  {
    id: 'instagram-square',
    platform: 'Instagram',
    name: 'Square Loop 1:1',
    ratioLabel: '1:1',
    width: 1080,
    height: 1080,
    fps: 15,
    safeZone: {
      topPct: 0.06,
      rightPct: 0.06,
      bottomPct: 0.06,
      leftPct: 0.06,
      note: 'Balanced 1:1 social loop margin',
    },
  },
  {
    id: 'cinema-scope',
    platform: 'Cinema & TV',
    name: 'Widescreen Cinema',
    ratioLabel: '21:9',
    width: 1680,
    height: 720,
    fps: 24,
    safeZone: {
      topPct: 0.05,
      rightPct: 0.05,
      bottomPct: 0.05,
      leftPct: 0.05,
      note: 'Anamorphic 21:9 title safe area',
    },
  },
  {
    id: 'classic-4-3',
    platform: 'Cinema & TV',
    name: 'Classic Studio 4:3',
    ratioLabel: '4:3',
    width: 960,
    height: 720,
    fps: 12,
    safeZone: {
      topPct: 0.06,
      rightPct: 0.06,
      bottomPct: 0.06,
      leftPct: 0.06,
      note: 'Traditional 4:3 animation field guide',
    },
  },
  {
    id: 'game-sprite-tile',
    platform: 'Game Dev',
    name: '2D Game Sprite Tile',
    ratioLabel: '1:1',
    width: 512,
    height: 512,
    fps: 12,
    safeZone: {
      topPct: 0.08,
      rightPct: 0.08,
      bottomPct: 0.08,
      leftPct: 0.08,
      note: 'Character hitbox & pivot padding guide',
    },
  },
];

export function findScreenSheetById(id?: string): ScreenSheetPreset | undefined {
  if (!id) return undefined;
  return SCREEN_SHEET_PRESETS.find((p) => p.id === id);
}

export function findMatchingScreenSheet(width: number, height: number): ScreenSheetPreset | undefined {
  return SCREEN_SHEET_PRESETS.find((p) => p.width === width && p.height === height);
}
