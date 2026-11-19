import { AnimationProject, FrameData } from '../types/animation';

export function createBlankProject(
  name: string,
  width: number,
  height: number,
  fps: number,
  backgroundColor = '#FFFFFF',
  screenSheetId?: string,
  frameCount = 1
): AnimationProject {
  const now = Date.now();
  const layer1Id = `layer_${now}_1`;
  const layer2Id = `layer_${now}_2`;
  const count = Math.max(1, Math.min(120, Math.round(frameCount) || 1));

  const frames: FrameData[] = Array.from({ length: count }, (_, idx) => ({
    id: `frame_${now}_${idx + 1}`,
    cels: {},
  }));

  return {
    id: `proj_${now}`,
    name: name.trim() || 'Untitled Animation',
    width,
    height,
    fps,
    backgroundColor,
    screenSheetId,
    layers: [
      {
        id: layer1Id,
        name: 'Background',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
      },
      {
        id: layer2Id,
        name: 'Layer 1',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
      },
    ],
    frames,
    onionSkin: {
      enabled: true,
      prevFrames: 1,
      nextFrames: 1,
      opacity: 0.25,
      tintColors: true,
    },
    audio: null,
    createdAt: now,
    updatedAt: now,
  };
}
