import {
  BrushSettings,
  FrameData,
  Layer,
  ShapeSettings,
  VisemeType,
} from '../types/animation';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

// In-memory LRU-like cache for decoded cel images to keep playback and scrubbing instant
const imageCache = new Map<string, HTMLImageElement>();
const MAX_CACHE_ENTRIES = 600;

export function getCachedImage(dataUrl: string): HTMLImageElement | null {
  if (!dataUrl) return null;
  const cached = imageCache.get(dataUrl);
  if (cached && cached.complete) {
    return cached;
  }
  return null;
}

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  if (!dataUrl) {
    return Promise.reject(new Error('Empty dataUrl'));
  }
  const existing = imageCache.get(dataUrl);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    return Promise.resolve(existing);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (imageCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = imageCache.keys().next().value;
        if (firstKey) imageCache.delete(firstKey);
      }
      imageCache.set(dataUrl, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

export async function preloadFrameImages(frame: FrameData): Promise<void> {
  const urls = Object.values(frame.cels).filter(Boolean);
  await Promise.all(urls.map((url) => loadImage(url).catch(() => undefined)));
}

export function hexToRgba(hex: string, alpha = 1): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) {
    return { r: 0, g: 0, b: 0, a: Math.round(alpha * 255) };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: Math.round(Math.max(0, Math.min(1, alpha)) * 255),
  };
}

export function drawBrushSegment(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  brush: BrushSettings,
  isEraser: boolean
): void {
  const pressure = p2.pressure && p2.pressure > 0 ? p2.pressure : 0.7;
  const dynamicFactor = 0.65 + pressure * 0.55;
  const size = Math.max(1, brush.size * (brush.preset === 'ink' || brush.preset === 'pencil' ? dynamicFactor : 1));

  ctx.save();
  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = brush.opacity;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brush.size;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = brush.color;
  ctx.fillStyle = brush.color;

  if (brush.preset === 'ink') {
    ctx.globalAlpha = brush.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  } else if (brush.preset === 'marker') {
    ctx.globalAlpha = Math.min(brush.opacity, 0.45);
    ctx.lineCap = 'square';
    ctx.lineJoin = 'bevel';
    ctx.lineWidth = brush.size * 1.35;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  } else if (brush.preset === 'pencil') {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(1, Math.ceil(dist / 1.5));
    ctx.globalAlpha = brush.opacity * 0.65;
    const radius = Math.max(0.8, size * 0.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = p1.x + (p2.x - p1.x) * t;
      const cy = p1.y + (p2.y - p1.y) * t;
      const grains = Math.max(2, Math.round(size * 0.8));
      for (let g = 0; g < grains; g++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const gx = cx + Math.cos(angle) * r;
        const gy = cy + Math.sin(angle) * r;
        ctx.fillRect(gx, gy, 1.2, 1.2);
      }
    }
  } else if (brush.preset === 'spray') {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(1, Math.ceil(dist / 3));
    const sprayRadius = brush.size * 1.4;
    const density = Math.max(6, Math.round(brush.size * 1.2));
    ctx.globalAlpha = brush.opacity * 0.35;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = p1.x + (p2.x - p1.x) * t;
      const cy = p1.y + (p2.y - p1.y) * t;
      for (let d = 0; d < density; d++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * sprayRadius;
        ctx.fillRect(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 1.5, 1.5);
      }
    }
  }
  ctx.restore();
}

export function drawShapeOnCtx(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  shape: ShapeSettings,
  color: string,
  opacity: number
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  ctx.beginPath();
  if (shape.kind === 'line') {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (shape.kind === 'rect') {
    ctx.rect(x, y, w, h);
    if (shape.filled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  } else if (shape.kind === 'ellipse') {
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2);
    if (shape.filled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  opacity: number,
  tolerance = 36
): boolean {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return false;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const targetIdx = (sy * width + sx) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  const fill = hexToRgba(fillColorHex, opacity);
  if (
    Math.abs(tr - fill.r) <= 3 &&
    Math.abs(tg - fill.g) <= 3 &&
    Math.abs(tb - fill.b) <= 3 &&
    Math.abs(ta - fill.a) <= 3
  ) {
    return false;
  }

  const visited = new Uint8Array(width * height);
  const stack: number[] = [sx, sy];

  const matches = (idx: number) => {
    const dr = data[idx] - tr;
    const dg = data[idx + 1] - tg;
    const db = data[idx + 2] - tb;
    const da = data[idx + 3] - ta;
    return Math.abs(dr) <= tolerance && Math.abs(dg) <= tolerance && Math.abs(db) <= tolerance && Math.abs(da) <= tolerance;
  };

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const pos = y * width + x;
    if (visited[pos]) continue;

    let lx = x;
    while (lx >= 0 && !visited[y * width + lx] && matches((y * width + lx) * 4)) {
      lx--;
    }
    lx++;

    let rx = x;
    while (rx < width && !visited[y * width + rx] && matches((y * width + rx) * 4)) {
      rx++;
    }
    rx--;

    let spanAbove = false;
    let spanBelow = false;

    for (let cx = lx; cx <= rx; cx++) {
      const p = y * width + cx;
      visited[p] = 1;
      const i = p * 4;
      data[i] = fill.r;
      data[i + 1] = fill.g;
      data[i + 2] = fill.b;
      data[i + 3] = fill.a;

      if (y > 0) {
        const upPos = (y - 1) * width + cx;
        const upMatch = !visited[upPos] && matches(upPos * 4);
        if (!spanAbove && upMatch) {
          stack.push(cx, y - 1);
          spanAbove = true;
        } else if (spanAbove && !upMatch) {
          spanAbove = false;
        }
      }

      if (y < height - 1) {
        const downPos = (y + 1) * width + cx;
        const downMatch = !visited[downPos] && matches(downPos * 4);
        if (!spanBelow && downMatch) {
          stack.push(cx, y + 1);
          spanBelow = true;
        } else if (spanBelow && !downMatch) {
          spanBelow = false;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
}

/**
 * Composites a frame's visible layers onto a target canvas.
 * Ensures all layer images are loaded first when async mode is used.
 */
export async function renderFrameComposite(
  frame: FrameData,
  layers: Layer[],
  width: number,
  height: number,
  backgroundColor: string,
  targetCanvas: HTMLCanvasElement,
  includeBackground = true
): Promise<void> {
  await preloadFrameImages(frame);
  if (targetCanvas.width !== width) targetCanvas.width = width;
  if (targetCanvas.height !== height) targetCanvas.height = height;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  if (includeBackground && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  for (const layer of layers) {
    if (!layer.visible) continue;
    const celUrl = frame.cels[layer.id];
    if (!celUrl) continue;
    const img = getCachedImage(celUrl);
    if (!img) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.restore();
  }
}

export async function generateThumbnailDataUrl(
  frame: FrameData,
  layers: Layer[],
  width: number,
  height: number,
  backgroundColor: string,
  maxThumbWidth = 160
): Promise<string> {
  const ratio = height / width;
  const tw = maxThumbWidth;
  const th = Math.max(40, Math.round(tw * ratio));

  const fullCanvas = document.createElement('canvas');
  await renderFrameComposite(frame, layers, width, height, backgroundColor, fullCanvas, true);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = tw;
  thumbCanvas.height = th;
  const tctx = thumbCanvas.getContext('2d');
  if (!tctx) return '';

  if (backgroundColor === 'transparent') {
    tctx.fillStyle = '#20242D';
    tctx.fillRect(0, 0, tw, th);
  }
  tctx.drawImage(fullCanvas, 0, 0, tw, th);
  return thumbCanvas.toDataURL('image/png');
}

/**
 * Draws a crisp stylized cartoon viseme mouth on a canvas context at (cx, cy).
 */
export function drawVisemeMouth(
  ctx: CanvasRenderingContext2D,
  viseme: VisemeType,
  cx: number,
  cy: number,
  scale = 1,
  outlineColor = '#1E1B24',
  insideColor = '#7F1D2C',
  tongueColor = '#F46B7A'
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = outlineColor;

  if (viseme === 'X') {
    // Relaxed closed smile curve
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(0, 8, 22, 0);
    ctx.stroke();
  } else if (viseme === 'MBP') {
    // Pressed lips straight/subtle line with cheek dimples
    ctx.beginPath();
    ctx.moveTo(-24, 2);
    ctx.quadraticCurveTo(0, -2, 24, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-26, -2);
    ctx.lineTo(-24, 5);
    ctx.moveTo(26, -2);
    ctx.lineTo(24, 5);
    ctx.stroke();
  } else if (viseme === 'EI') {
    // Narrow wide smile showing upper teeth
    ctx.beginPath();
    ctx.moveTo(-28, -4);
    ctx.quadraticCurveTo(0, -6, 28, -4);
    ctx.quadraticCurveTo(22, 16, 0, 16);
    ctx.quadraticCurveTo(-22, 16, -28, -4);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();

    // Subtle teeth separator line
    ctx.beginPath();
    ctx.moveTo(-20, 4);
    ctx.lineTo(20, 4);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (viseme === 'AO') {
    // Rounded 'O' vowel mouth
    ctx.beginPath();
    ctx.ellipse(0, 6, 16, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = insideColor;
    ctx.fill();
    ctx.stroke();

    // Tongue hint at bottom
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = tongueColor;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(0, 6, 16, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (viseme === 'AA') {
    // Wide expressive open mouth with upper teeth & tongue
    ctx.beginPath();
    ctx.moveTo(-30, -8);
    ctx.quadraticCurveTo(0, -10, 30, -8);
    ctx.bezierCurveTo(32, 24, 18, 32, 0, 32);
    ctx.bezierCurveTo(-18, 32, -32, 24, -30, -8);
    ctx.closePath();
    ctx.fillStyle = insideColor;
    ctx.fill();

    ctx.save();
    ctx.clip();
    // Upper teeth bar
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-26, -12, 52, 12);
    // Tongue
    ctx.beginPath();
    ctx.ellipse(0, 26, 20, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = tongueColor;
    ctx.fill();
    ctx.restore();

    ctx.stroke();
  }

  ctx.restore();
}
