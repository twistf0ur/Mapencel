import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, FlipHorizontal2, FlipVertical2, Trash2 } from 'lucide-react';
import {
  BrushSettings,
  FrameData,
  Layer,
  OnionSkinSettings,
  SelectionBox,
  ShapeSettings,
  ToolType,
} from '../types/animation';
import {
  Point,
  drawBrushSegment,
  drawShapeOnCtx,
  floodFillCanvas,
  getCachedImage,
  loadImage,
  preloadFrameImages,
} from '../utils/drawing';
import { findMatchingScreenSheet, findScreenSheetById } from '../utils/screenSheets';

interface CanvasStageProps {
  width: number;
  height: number;
  backgroundColor: string;
  layers: Layer[];
  frames: FrameData[];
  currentFrameIndex: number;
  activeLayerId: string;
  onionSkin: OnionSkinSettings;
  isPlaying: boolean;
  showGrid: boolean;
  showSafeZones?: boolean;
  screenSheetId?: string;
  activeTool: ToolType;
  brush: BrushSettings;
  shape: ShapeSettings;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onCommitCel: (layerId: string, dataUrl: string) => void;
  onPickColor: (hex: string) => void;
  onNotify: (msg: string) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  width,
  height,
  backgroundColor,
  layers,
  frames,
  currentFrameIndex,
  activeLayerId,
  onionSkin,
  isPlaying,
  showGrid,
  showSafeZones = false,
  screenSheetId,
  activeTool,
  brush,
  shape,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onCommitCel,
  onPickColor,
  onNotify,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement>(null);
  const lowerCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const upperCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const lastPointRef = useRef<Point | null>(null);
  const shapeStartRef = useRef<Point | null>(null);
  const spacePressedRef = useRef(false);

  // Selection state
  const [selection, setSelection] = useState<SelectionBox | null>(null);
  const selectionModeRef = useRef<'none' | 'creating' | 'moving' | 'resizing'>('none');
  const selectionOriginRef = useRef<{
    startX: number;
    startY: number;
    boxStart?: SelectionBox;
  }>({ startX: 0, startY: 0 });
  const marqueeRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Text tool floating prompt
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);

  const currentFrame = frames[currentFrameIndex];
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const activeLayerIndex = layers.findIndex((l) => l.id === activeLayerId);

  // Commit floating selection onto active layer canvas
  const commitSelection = useCallback(
    async (selToCommit: SelectionBox | null) => {
      if (!selToCommit || !activeCanvasRef.current) return;
      const ctx = activeCanvasRef.current.getContext('2d');
      if (!ctx) return;

      const img = await loadImage(selToCommit.imageDataUrl).catch(() => null);
      if (img) {
        ctx.save();
        ctx.translate(selToCommit.x + selToCommit.width / 2, selToCommit.y + selToCommit.height / 2);
        ctx.scale(selToCommit.flipX ? -1 : 1, selToCommit.flipY ? -1 : 1);
        ctx.drawImage(
          img,
          -selToCommit.width / 2,
          -selToCommit.height / 2,
          selToCommit.width,
          selToCommit.height
        );
        ctx.restore();
      }
      onCommitCel(activeLayerId, activeCanvasRef.current.toDataURL('image/png'));
      setSelection(null);
    },
    [activeLayerId, onCommitCel]
  );

  // Clear or commit selection when switching frame/layer/playing
  useEffect(() => {
    setSelection(null);
    setTextInput(null);
  }, [currentFrameIndex, activeLayerId, isPlaying]);

  // Track Spacebar for temporary pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        spacePressedRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Render Lower, Active, and Upper layer canvases whenever frame/layers change
  useEffect(() => {
    let cancelled = false;

    const renderLayers = async () => {
      if (!currentFrame) return;
      await preloadFrameImages(currentFrame);
      if (cancelled) return;

      // Lower layers (0 .. activeLayerIndex - 1)
      if (lowerCanvasRef.current) {
        const lCanvas = lowerCanvasRef.current;
        if (lCanvas.width !== width) lCanvas.width = width;
        if (lCanvas.height !== height) lCanvas.height = height;
        const lctx = lCanvas.getContext('2d')!;
        lctx.clearRect(0, 0, width, height);
        for (let i = 0; i < activeLayerIndex; i++) {
          const layer = layers[i];
          if (!layer.visible) continue;
          const url = currentFrame.cels[layer.id];
          if (!url) continue;
          const img = getCachedImage(url);
          if (!img) continue;
          lctx.save();
          lctx.globalAlpha = layer.opacity;
          lctx.globalCompositeOperation = layer.blendMode;
          lctx.drawImage(img, 0, 0, width, height);
          lctx.restore();
        }
      }

      // Active layer
      if (activeCanvasRef.current) {
        const aCanvas = activeCanvasRef.current;
        if (aCanvas.width !== width) aCanvas.width = width;
        if (aCanvas.height !== height) aCanvas.height = height;
        const actx = aCanvas.getContext('2d')!;
        actx.clearRect(0, 0, width, height);
        if (activeLayer) {
          const url = currentFrame.cels[activeLayer.id];
          if (url) {
            const img = getCachedImage(url);
            if (img) actx.drawImage(img, 0, 0, width, height);
          }
        }
      }

      // Upper layers (activeLayerIndex + 1 .. end)
      if (upperCanvasRef.current) {
        const uCanvas = upperCanvasRef.current;
        if (uCanvas.width !== width) uCanvas.width = width;
        if (uCanvas.height !== height) uCanvas.height = height;
        const uctx = uCanvas.getContext('2d')!;
        uctx.clearRect(0, 0, width, height);
        for (let i = activeLayerIndex + 1; i < layers.length; i++) {
          const layer = layers[i];
          if (!layer.visible) continue;
          const url = currentFrame.cels[layer.id];
          if (!url) continue;
          const img = getCachedImage(url);
          if (!img) continue;
          uctx.save();
          uctx.globalAlpha = layer.opacity;
          uctx.globalCompositeOperation = layer.blendMode;
          uctx.drawImage(img, 0, 0, width, height);
          uctx.restore();
        }
      }
    };

    renderLayers();
    return () => {
      cancelled = true;
    };
  }, [currentFrame, layers, activeLayerIndex, activeLayer, width, height]);

  // Render Onion Skin canvas
  useEffect(() => {
    let cancelled = false;
    const renderOnion = async () => {
      const canvas = onionCanvasRef.current;
      if (!canvas) return;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, width, height);

      if (!onionSkin.enabled || isPlaying) return;

      const drawTintedFrame = async (frameIdx: number, tint: string, alpha: number) => {
        if (frameIdx < 0 || frameIdx >= frames.length) return;
        const frame = frames[frameIdx];
        await preloadFrameImages(frame);
        if (cancelled) return;

        const temp = document.createElement('canvas');
        temp.width = width;
        temp.height = height;
        const tctx = temp.getContext('2d')!;

        for (const layer of layers) {
          if (!layer.visible) continue;
          const url = frame.cels[layer.id];
          if (!url) continue;
          const img = getCachedImage(url);
          if (!img) continue;
          tctx.save();
          tctx.globalAlpha = layer.opacity;
          tctx.drawImage(img, 0, 0, width, height);
          tctx.restore();
        }

        if (onionSkin.tintColors) {
          tctx.globalCompositeOperation = 'source-in';
          tctx.fillStyle = tint;
          tctx.fillRect(0, 0, width, height);
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(temp, 0, 0);
        ctx.restore();
      };

      // Previous frames (Rose tint)
      for (let i = onionSkin.prevFrames; i >= 1; i--) {
        const falloff = 1 - (i - 1) * 0.28;
        await drawTintedFrame(currentFrameIndex - i, '#F43F5E', onionSkin.opacity * falloff);
      }

      // Next frames (Sky tint)
      for (let i = onionSkin.nextFrames; i >= 1; i--) {
        const falloff = 1 - (i - 1) * 0.28;
        await drawTintedFrame(currentFrameIndex + i, '#38BDF8', onionSkin.opacity * falloff);
      }
    };

    renderOnion();
    return () => {
      cancelled = true;
    };
  }, [onionSkin, isPlaying, frames, currentFrameIndex, layers, width, height]);

  // Render Overlay (Grid, Selection Box, Marquee)
  const redrawOverlay = useCallback(
    async (liveShapeEnd?: Point) => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, width, height);

      // Grid & Safe Area
      if (showGrid && !isPlaying) {
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.lineWidth = 1;
        // Rule of thirds
        for (let i = 1; i <= 2; i++) {
          const x = (width / 3) * i;
          const y = (height / 3) * i;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        // Center crosshair
        ctx.strokeStyle = 'rgba(255, 90, 54, 0.32)';
        ctx.beginPath();
        ctx.moveTo(width / 2 - 14, height / 2);
        ctx.lineTo(width / 2 + 14, height / 2);
        ctx.moveTo(width / 2, height / 2 - 14);
        ctx.lineTo(width / 2, height / 2 + 14);
        ctx.stroke();
        ctx.restore();
      }

      // Platform Safe-Zone Guides (YouTube, TikTok, Instagram, etc.)
      if (showSafeZones && !isPlaying) {
        const sheet = findScreenSheetById(screenSheetId) || findMatchingScreenSheet(width, height);
        const margins = sheet?.safeZone || {
          topPct: 0.06,
          rightPct: 0.06,
          bottomPct: 0.06,
          leftPct: 0.06,
          note: 'Action Safe Area',
        };
        const sx = Math.round(width * margins.leftPct);
        const sy = Math.round(height * margins.topPct);
        const sw = Math.round(width * (1 - margins.leftPct - margins.rightPct));
        const sh = Math.round(height * (1 - margins.topPct - margins.bottomPct));

        ctx.save();
        // Shade outer platform UI danger zone gently
        ctx.fillStyle = 'rgba(255, 90, 54, 0.07)';
        ctx.fillRect(0, 0, width, sy);
        ctx.fillRect(0, sy + sh, width, height - (sy + sh));
        ctx.fillRect(0, sy, sx, sh);
        ctx.fillRect(sx + sw, sy, width - (sx + sw), sh);

        // Dashed safe-zone rectangle
        ctx.strokeStyle = 'rgba(255, 90, 54, 0.65)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);

        // Subtle label
        const label = `${sheet ? sheet.name : `${width}×${height}`} · Safe Zone`;
        ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 90, 54, 0.85)';
        ctx.fillText(label, sx + 10, sy + 20);
        ctx.restore();
      }

      // Live shape preview
      if (shapeStartRef.current && liveShapeEnd && activeTool === 'shape') {
        drawShapeOnCtx(ctx, shapeStartRef.current, liveShapeEnd, shape, brush.color, brush.opacity);
      }

      // Marquee drag box
      if (marqueeRectRef.current) {
        const r = marqueeRectRef.current;
        ctx.save();
        ctx.strokeStyle = '#FF5A36';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = 'rgba(255, 90, 54, 0.08)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.restore();
      }

      // Floating transformed selection
      if (selection) {
        const img = await loadImage(selection.imageDataUrl).catch(() => null);
        if (img) {
          ctx.save();
          ctx.translate(selection.x + selection.width / 2, selection.y + selection.height / 2);
          ctx.scale(selection.flipX ? -1 : 1, selection.flipY ? -1 : 1);
          ctx.drawImage(
            img,
            -selection.width / 2,
            -selection.height / 2,
            selection.width,
            selection.height
          );
          ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = '#FF5A36';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
        ctx.setLineDash([]);

        // Bottom-right resize handle
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#FF5A36';
        ctx.lineWidth = 2;
        ctx.fillRect(selection.x + selection.width - 7, selection.y + selection.height - 7, 14, 14);
        ctx.strokeRect(selection.x + selection.width - 7, selection.y + selection.height - 7, 14, 14);
        ctx.restore();
      }
    },
    [width, height, showGrid, showSafeZones, screenSheetId, isPlaying, activeTool, shape, brush.color, brush.opacity, selection]
  );

  useEffect(() => {
    redrawOverlay();
  }, [redrawOverlay]);

  const toCanvasCoords = (clientX: number, clientY: number, pressure = 0.5): Point => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure };
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      pressure,
    };
  };

  const handlePointerDown = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;

    // Middle mouse or Spacebar or Pan tool -> Panning
    if (e.button === 1 || spacePressedRef.current || activeTool === 'pan') {
      e.currentTarget.setPointerCapture(e.pointerId);
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }

    if (e.button !== 0) return;

    const pt = toCanvasCoords(e.clientX, e.clientY, e.pressure);

    // Eyedropper samples composite at point
    if (activeTool === 'eyedropper') {
      const comp = document.createElement('canvas');
      comp.width = width;
      comp.height = height;
      const cctx = comp.getContext('2d')!;
      if (backgroundColor !== 'transparent') {
        cctx.fillStyle = backgroundColor;
        cctx.fillRect(0, 0, width, height);
      }
      if (lowerCanvasRef.current) cctx.drawImage(lowerCanvasRef.current, 0, 0);
      if (activeCanvasRef.current) cctx.drawImage(activeCanvasRef.current, 0, 0);
      if (upperCanvasRef.current) cctx.drawImage(upperCanvasRef.current, 0, 0);

      const px = Math.max(0, Math.min(width - 1, Math.floor(pt.x)));
      const py = Math.max(0, Math.min(height - 1, Math.floor(pt.y)));
      const data = cctx.getImageData(px, py, 1, 1).data;
      if (data[3] > 0) {
        const hex =
          '#' +
          [data[0], data[1], data[2]]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('');
        onPickColor(hex);
        onNotify(`Picked color ${hex.toUpperCase()}`);
      }
      return;
    }

    // Guard locked or hidden active layer for editing tools
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
      onNotify(
        activeLayer?.locked
          ? `Layer "${activeLayer.name}" is locked.`
          : `Layer "${activeLayer?.name || ''}" is hidden.`
      );
      return;
    }

    // Text stamp tool
    if (activeTool === 'text') {
      setTextInput({ x: Math.round(pt.x), y: Math.round(pt.y), value: '' });
      return;
    }

    // Flood fill tool
    if (activeTool === 'fill') {
      const aCanvas = activeCanvasRef.current;
      if (!aCanvas) return;
      const actx = aCanvas.getContext('2d', { willReadFrequently: true })!;
      const changed = floodFillCanvas(actx, pt.x, pt.y, brush.color, brush.opacity, 36);
      if (changed) {
        onCommitCel(activeLayerId, aCanvas.toDataURL('image/png'));
      }
      return;
    }

    // Select & Transform tool
    if (activeTool === 'select') {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (selection) {
        // Check resize handle (bottom-right 20x20 area)
        const handleX = selection.x + selection.width;
        const handleY = selection.y + selection.height;
        if (Math.abs(pt.x - handleX) <= 18 && Math.abs(pt.y - handleY) <= 18) {
          selectionModeRef.current = 'resizing';
          selectionOriginRef.current = {
            startX: pt.x,
            startY: pt.y,
            boxStart: { ...selection },
          };
          return;
        }
        // Check inside selection box -> move
        if (
          pt.x >= selection.x &&
          pt.x <= selection.x + selection.width &&
          pt.y >= selection.y &&
          pt.y <= selection.y + selection.height
        ) {
          selectionModeRef.current = 'moving';
          selectionOriginRef.current = {
            startX: pt.x,
            startY: pt.y,
            boxStart: { ...selection },
          };
          return;
        }
        // Clicked outside -> commit existing selection first
        await commitSelection(selection);
      }

      selectionModeRef.current = 'creating';
      selectionOriginRef.current = { startX: pt.x, startY: pt.y };
      marqueeRectRef.current = { x: pt.x, y: pt.y, w: 0, h: 0 };
      redrawOverlay();
      return;
    }

    // Shape tool
    if (activeTool === 'shape') {
      e.currentTarget.setPointerCapture(e.pointerId);
      shapeStartRef.current = pt;
      isDrawingRef.current = true;
      return;
    }

    // Brush / Eraser tool
    if (activeTool === 'pen' || activeTool === 'eraser') {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      lastPointRef.current = pt;
      const aCanvas = activeCanvasRef.current;
      if (aCanvas) {
        const actx = aCanvas.getContext('2d')!;
        drawBrushSegment(actx, pt, { ...pt, x: pt.x + 0.01 }, brush, activeTool === 'eraser');
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      onPanChange({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      return;
    }

    const pt = toCanvasCoords(e.clientX, e.clientY, e.pressure);

    if (activeTool === 'select' && selectionModeRef.current !== 'none') {
      if (selectionModeRef.current === 'creating') {
        const sx = selectionOriginRef.current.startX;
        const sy = selectionOriginRef.current.startY;
        marqueeRectRef.current = {
          x: Math.min(sx, pt.x),
          y: Math.min(sy, pt.y),
          w: Math.abs(pt.x - sx),
          h: Math.abs(pt.y - sy),
        };
        redrawOverlay();
      } else if (selectionModeRef.current === 'moving' && selectionOriginRef.current.boxStart) {
        const dx = pt.x - selectionOriginRef.current.startX;
        const dy = pt.y - selectionOriginRef.current.startY;
        const bs = selectionOriginRef.current.boxStart;
        setSelection({ ...bs, x: bs.x + dx, y: bs.y + dy });
      } else if (selectionModeRef.current === 'resizing' && selectionOriginRef.current.boxStart) {
        const dx = pt.x - selectionOriginRef.current.startX;
        const dy = pt.y - selectionOriginRef.current.startY;
        const bs = selectionOriginRef.current.boxStart;
        setSelection({
          ...bs,
          width: Math.max(12, bs.width + dx),
          height: Math.max(12, bs.height + dy),
        });
      }
      return;
    }

    if (!isDrawingRef.current) return;

    if (activeTool === 'shape' && shapeStartRef.current) {
      redrawOverlay(pt);
      return;
    }

    if ((activeTool === 'pen' || activeTool === 'eraser') && lastPointRef.current && activeCanvasRef.current) {
      const actx = activeCanvasRef.current.getContext('2d')!;
      drawBrushSegment(actx, lastPointRef.current, pt, brush, activeTool === 'eraser');
      lastPointRef.current = pt;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    const pt = toCanvasCoords(e.clientX, e.clientY, e.pressure);

    if (activeTool === 'select' && selectionModeRef.current !== 'none') {
      const mode = selectionModeRef.current;
      selectionModeRef.current = 'none';
      if (mode === 'creating' && marqueeRectRef.current) {
        const r = marqueeRectRef.current;
        marqueeRectRef.current = null;
        const rx = Math.max(0, Math.floor(r.x));
        const ry = Math.max(0, Math.floor(r.y));
        const rw = Math.min(width - rx, Math.ceil(r.w));
        const rh = Math.min(height - ry, Math.ceil(r.h));

        if (rw >= 6 && rh >= 6 && activeCanvasRef.current) {
          const actx = activeCanvasRef.current.getContext('2d')!;
          const crop = document.createElement('canvas');
          crop.width = rw;
          crop.height = rh;
          crop.getContext('2d')!.drawImage(activeCanvasRef.current, rx, ry, rw, rh, 0, 0, rw, rh);
          actx.clearRect(rx, ry, rw, rh);
          onCommitCel(activeLayerId, activeCanvasRef.current.toDataURL('image/png'));
          setSelection({
            x: rx,
            y: ry,
            width: rw,
            height: rh,
            imageDataUrl: crop.toDataURL('image/png'),
          });
        } else {
          redrawOverlay();
        }
      }
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activeTool === 'shape' && shapeStartRef.current && activeCanvasRef.current) {
      const actx = activeCanvasRef.current.getContext('2d')!;
      drawShapeOnCtx(actx, shapeStartRef.current, pt, shape, brush.color, brush.opacity);
      shapeStartRef.current = null;
      redrawOverlay();
      onCommitCel(activeLayerId, activeCanvasRef.current.toDataURL('image/png'));
      return;
    }

    if ((activeTool === 'pen' || activeTool === 'eraser') && activeCanvasRef.current) {
      lastPointRef.current = null;
      onCommitCel(activeLayerId, activeCanvasRef.current.toDataURL('image/png'));
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      const next = Math.max(0.2, Math.min(4, +(zoom * factor).toFixed(2)));
      onZoomChange(next);
    }
  };

  const handleStampText = () => {
    if (!textInput || !textInput.value.trim() || !activeCanvasRef.current) {
      setTextInput(null);
      return;
    }
    const actx = activeCanvasRef.current.getContext('2d')!;
    const fontSize = Math.max(18, Math.round(brush.size * 2.2));
    actx.save();
    actx.globalAlpha = brush.opacity;
    actx.fillStyle = brush.color;
    actx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    actx.textBaseline = 'middle';
    actx.fillText(textInput.value, textInput.x, textInput.y);
    actx.restore();
    onCommitCel(activeLayerId, activeCanvasRef.current.toDataURL('image/png'));
    setTextInput(null);
  };

  const cursorClass =
    activeTool === 'pan' || spacePressedRef.current
      ? 'cursor-grab active:cursor-grabbing'
      : activeTool === 'eyedropper' || activeTool === 'fill'
      ? 'cursor-crosshair'
      : activeTool === 'text'
      ? 'cursor-text'
      : 'cursor-crosshair';

  return (
    <div
      ref={viewportRef}
      data-canvas-viewport="true"
      onWheel={handleWheel}
      className="relative flex-1 min-w-0 min-h-0 h-full bg-[#111318] overflow-hidden flex items-center justify-center select-none"
    >
      {/* Subtle studio workbench dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'radial-gradient(#2E3545 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Floating Selection Action Bar */}
      {selection && !isPlaying && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#1D212B] border border-[#343B4C] rounded-lg px-2 py-1 shadow-xl">
          <span className="text-[11px] font-medium text-[#9CA3AF] px-1.5">Selection</span>
          <button
            type="button"
            onClick={() => setSelection({ ...selection, flipX: !selection.flipX })}
            title="Flip Horizontal"
            className="p-1.5 rounded hover:bg-[#2A303E] text-[#D1D5DB]"
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setSelection({ ...selection, flipY: !selection.flipY })}
            title="Flip Vertical"
            className="p-1.5 rounded hover:bg-[#2A303E] text-[#D1D5DB]"
          >
            <FlipVertical2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={async () => {
              await commitSelection(selection);
              setSelection({
                ...selection,
                x: selection.x + 24,
                y: selection.y + 24,
              });
            }}
            title="Stamp & Duplicate"
            className="p-1.5 rounded hover:bg-[#2A303E] text-[#D1D5DB]"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setSelection(null)}
            title="Delete Selection"
            className="p-1.5 rounded hover:bg-[#F43F5E]/20 text-[#F43F5E]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => commitSelection(selection)}
            className="ml-1 px-2.5 py-1 rounded bg-[#FF5A36] hover:bg-[#FF6E4E] text-white text-xs font-semibold flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            <span>Apply</span>
          </button>
        </div>
      )}

      {/* Text Stamp Floating Input */}
      {textInput && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#1D212B] border border-[#FF5A36]/60 rounded-lg px-3 py-1.5 shadow-xl">
          <input
            type="text"
            autoFocus
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleStampText();
              if (e.key === 'Escape') setTextInput(null);
            }}
            placeholder="Type text & press Enter..."
            className="bg-[#12141A] border border-[#2E3443] rounded px-2.5 py-1 text-xs text-white w-52"
          />
          <button
            type="button"
            onClick={handleStampText}
            className="px-2.5 py-1 rounded bg-[#FF5A36] text-white text-xs font-semibold"
          >
            Stamp
          </button>
          <button
            type="button"
            onClick={() => setTextInput(null)}
            className="px-2 py-1 rounded bg-[#282D3A] text-[#9CA3AF] text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Scaled & Panned Artboard Container */}
      <div
        className="relative shrink-0 shadow-2xl border border-[#2F3646] overflow-hidden"
        style={{
          width,
          height,
          minWidth: width,
          minHeight: height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Background paper or checkerboard */}
        <div
          className={`absolute inset-0 ${backgroundColor === 'transparent' ? 'checkerboard-bg' : ''}`}
          style={backgroundColor !== 'transparent' ? { backgroundColor } : undefined}
        />

        {/* Onion Skin Underlay */}
        <canvas
          ref={onionCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Lower Layers */}
        <canvas
          ref={lowerCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Active Layer Canvas */}
        <canvas
          ref={activeCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            opacity: activeLayer?.visible ? activeLayer.opacity : 0,
            mixBlendMode:
              activeLayer?.blendMode === 'multiply'
                ? 'multiply'
                : activeLayer?.blendMode === 'screen'
                ? 'screen'
                : 'normal',
          }}
        />

        {/* Upper Layers */}
        <canvas
          ref={upperCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Interactive Overlay & Pointer Receiver */}
        <canvas
          ref={overlayCanvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute inset-0 w-full h-full touch-none ${cursorClass}`}
        />
      </div>

      {/* Bottom-left subtle stage coordinates / dimensions indicator */}
      <div className="absolute bottom-2.5 left-3 pointer-events-none flex items-center gap-2 text-[11px] font-mono text-[#6B7280] tabular-nums">
        <span>
          {width}×{height}
        </span>
        <span aria-hidden="true">·</span>
        <span>{Math.round(zoom * 100)}%</span>
        {activeLayer && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-[#9CA3AF] font-sans">{activeLayer.name}</span>
          </>
        )}
      </div>
    </div>
  );
};
