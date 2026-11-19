declare module 'gifenc' {
  export interface GIFEncoderInstance {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: number[][];
        delay?: number;
        transparent?: boolean;
        transparentIndex?: number;
        repeat?: number;
        dispose?: number;
      }
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  }

  export function GIFEncoder(): GIFEncoderInstance;
  export function quantize(
    rgba: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    options?: {
      format?: 'rgb444' | 'rgb565' | 'rgba4444';
      oneBitAlpha?: boolean | number;
      clearAlpha?: boolean;
      clearAlphaThreshold?: number;
    }
  ): number[][];
  export function applyPalette(
    rgba: Uint8ClampedArray | Uint8Array,
    palette: number[][],
    format?: 'rgb444' | 'rgb565' | 'rgba4444'
  ): Uint8Array;
}
