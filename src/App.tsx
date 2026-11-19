import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { DesktopAppModal } from './components/DesktopAppModal';
import { ExportModal, ExportTab } from './components/ExportModal';
import { LandingPage } from './components/LandingPage';
import { LeftToolbar } from './components/LeftToolbar';
import { NewProjectSetup } from './components/NewProjectSetup';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProjectsModal } from './components/ProjectsModal';
import { RightInspector } from './components/RightInspector';
import { ScreenSheetsModal } from './components/ScreenSheetsModal';
import { Timeline } from './components/Timeline';
import { TopBar } from './components/TopBar';
import {
  AnimationProject,
  AudioTrackData,
  BrushSettings,
  FrameData,
  HistorySnapshot,
  Layer,
  OnionSkinSettings,
  ShapeSettings,
  ToolType,
  VisemeType,
  WorkspaceLayout,
} from './types/animation';
import {
  analyzeAudioToVisemes,
  decodeAudioDataUrl,
  generateDemoVoiceTrack,
  getAudioContext,
  processUploadedAudioFile,
} from './utils/audio';
import { drawVisemeMouth, loadImage } from './utils/drawing';
import { ScreenSheetPreset } from './utils/screenSheets';
import { createBlankProject } from './utils/starterProject';
import {
  deleteProjectFromDB,
  getLastActiveProjectId,
  listProjectsFromDB,
  loadProjectFromDB,
  saveProjectToDB,
} from './utils/storage';

const MAX_HISTORY = 40;

export default function App() {
  const [project, setProject] = useState<AnimationProject | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [activeLayerId, setActiveLayerId] = useState<string>('');

  // History stacks
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  // Tool & Stage UI states
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [brush, setBrush] = useState<BrushSettings>({
    preset: 'ink',
    size: 8,
    opacity: 1,
    color: '#1E293B',
    smoothing: 0.4,
  });
  const [shape, setShape] = useState<ShapeSettings>({
    kind: 'ellipse',
    filled: false,
    strokeWidth: 5,
  });
  const [recentColors, setRecentColors] = useState<string[]>(['#1E293B', '#FF5A36', '#34D399']);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loop, setLoop] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(0.72);
  const [autoFitZoom, setAutoFitZoom] = useState<boolean>(true);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [copiedFrame, setCopiedFrame] = useState<FrameData | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportInitialTab, setExportInitialTab] = useState<ExportTab>('video');
  const [showProjectsModal, setShowProjectsModal] = useState<boolean>(false);
  const [showSheetsModal, setShowSheetsModal] = useState<boolean>(false);
  const [showDesktopModal, setShowDesktopModal] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [layout, setLayout] = useState<WorkspaceLayout>(() => {
    try {
      const saved = localStorage.getItem('celdraft_workspace_layout');
      if (saved === 'studio' || saved === 'storyboard' || saved === 'focus' || saved === 'mirrored') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'studio';
  });
  const [focusInspectorOpen, setFocusInspectorOpen] = useState<boolean>(false);
  const [storyboardRightTab, setStoryboardRightTab] = useState<'frames' | 'inspector'>('frames');
  const [viewMode, setViewMode] = useState<'landing' | 'new-project' | 'studio'>('landing');
  const [hasSavedProjects, setHasSavedProjects] = useState<boolean>(false);
  const [pendingPreset, setPendingPreset] = useState<
    | {
        name?: string;
        width?: number;
        height?: number;
        fps?: number;
        screenSheetId?: string;
        layout?: WorkspaceLayout;
      }
    | undefined
  >(undefined);

  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const fitCanvasToViewport = useCallback(
    (w: number, h: number, targetLayout: WorkspaceLayout = layout) => {
      const stageEl = document.querySelector('[data-canvas-viewport]') as HTMLElement | null;
      const sideReserve = targetLayout === 'focus' ? 96 : targetLayout === 'storyboard' ? 560 : 520;
      const vertReserve = targetLayout === 'focus' ? 196 : targetLayout === 'storyboard' ? 84 : 280;
      const availW = stageEl
        ? Math.max(180, stageEl.clientWidth - 48)
        : Math.max(240, window.innerWidth - sideReserve);
      const availH = stageEl
        ? Math.max(180, stageEl.clientHeight - 48)
        : Math.max(200, window.innerHeight - vertReserve);
      const ratio = Math.min(availW / w, availH / h, 1);
      setZoom(Math.max(0.1, +ratio.toFixed(2)));
      setPan({ x: 0, y: 0 });
    },
    [layout]
  );

  // Refit drawing canvas automatically when browser window resizes (while auto-fit is active)
  useEffect(() => {
    if (viewMode !== 'studio' || !project || !autoFitZoom) return;
    const onResize = () => {
      fitCanvasToViewport(project.width, project.height);
    };
    window.addEventListener('resize', onResize);
    // Also refit once immediately after studio mounts so [data-canvas-viewport] is measured accurately
    const raf = requestAnimationFrame(onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [viewMode, project?.width, project?.height, autoFitZoom, fitCanvasToViewport]);

  const handleChangeLayout = useCallback(
    (nextLayout: WorkspaceLayout) => {
      setLayout(nextLayout);
      setFocusInspectorOpen(false);
      setAutoFitZoom(true);
      try {
        localStorage.setItem('celdraft_workspace_layout', nextLayout);
      } catch {
        // ignore
      }
      if (project) {
        requestAnimationFrame(() => fitCanvasToViewport(project.width, project.height, nextLayout));
      }
    },
    [project, fitCanvasToViewport]
  );

  const handleChangeStage = useCallback(
    (patch: {
      width?: number;
      height?: number;
      backgroundColor?: string;
      screenSheetId?: string;
      fps?: number;
    }) => {
      setProject((prev) => {
        if (!prev) return prev;
        const nextW = patch.width ?? prev.width;
        const nextH = patch.height ?? prev.height;
        if (patch.width !== undefined || patch.height !== undefined) {
          setAutoFitZoom(true);
          requestAnimationFrame(() => fitCanvasToViewport(nextW, nextH));
        }
        return { ...prev, ...patch };
      });
    },
    [fitCanvasToViewport]
  );

  // Load initial project from IndexedDB or create starter project
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const all = await listProjectsFromDB();
        const nonStarter = [];
        for (const item of all) {
          if (item.id.startsWith('proj_starter_')) {
            await deleteProjectFromDB(item.id).catch(() => undefined);
          } else {
            nonStarter.push(item);
          }
        }
        if (mounted) {
          setHasSavedProjects(nonStarter.length > 0);
        }
        const lastId = getLastActiveProjectId();
        let loaded: AnimationProject | null = null;
        if (lastId && !lastId.startsWith('proj_starter_')) {
          loaded = await loadProjectFromDB(lastId);
        }
        if (!loaded && nonStarter.length > 0) {
          loaded = nonStarter[0];
        }
        if (!loaded) {
          loaded = createBlankProject('Untitled Animation', 960, 540, 12, '#FAF9F6');
          await saveProjectToDB(loaded);
        }
        if (!mounted) return;
        setProject(loaded);
        setCurrentFrameIndex(0);
        setActiveLayerId(loaded.layers[loaded.layers.length - 1]?.id || '');
        fitCanvasToViewport(loaded.width, loaded.height);
      } catch {
        const fallback = createBlankProject('Untitled Animation', 960, 540, 12, '#FAF9F6');
        if (!mounted) return;
        setProject(fallback);
        setCurrentFrameIndex(0);
        setActiveLayerId(fallback.layers[fallback.layers.length - 1]?.id || '');
        fitCanvasToViewport(fallback.width, fallback.height);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [fitCanvasToViewport]);

  // Decode project audio buffer whenever project.audio changes
  useEffect(() => {
    let cancelled = false;
    if (!project?.audio?.dataUrl) {
      audioBufferRef.current = null;
      return;
    }
    decodeAudioDataUrl(project.audio.dataUrl)
      .then((buf) => {
        if (!cancelled) audioBufferRef.current = buf;
      })
      .catch(() => {
        if (!cancelled) audioBufferRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, [project?.audio?.dataUrl]);

  // Debounced autosave to IndexedDB
  useEffect(() => {
    if (!project) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(async () => {
      await saveProjectToDB(project).catch(() => undefined);
      setSaveStatus('saved');
    }, 550);
    return () => window.clearTimeout(timer);
  }, [project]);

  // Helper to push undo snapshot before mutating frames/layers
  const pushHistory = useCallback(
    (proj: AnimationProject) => {
      const snap: HistorySnapshot = {
        layers: proj.layers.map((l) => ({ ...l })),
        frames: proj.frames.map((f) => ({ ...f, cels: { ...f.cels } })),
        currentFrameIndex,
        activeLayerId,
      };
      setPast((prev) => [...prev.slice(-(MAX_HISTORY - 1)), snap]);
      setFuture([]);
    },
    [currentFrameIndex, activeLayerId]
  );

  const handleUndo = useCallback(() => {
    if (!project || past.length === 0) return;
    const prevSnap = past[past.length - 1];
    const currentSnap: HistorySnapshot = {
      layers: project.layers.map((l) => ({ ...l })),
      frames: project.frames.map((f) => ({ ...f, cels: { ...f.cels } })),
      currentFrameIndex,
      activeLayerId,
    };
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [currentSnap, ...f]);
    setProject((p) => (p ? { ...p, layers: prevSnap.layers, frames: prevSnap.frames } : p));
    setCurrentFrameIndex(Math.min(prevSnap.currentFrameIndex, prevSnap.frames.length - 1));
    setActiveLayerId(prevSnap.activeLayerId);
  }, [project, past, currentFrameIndex, activeLayerId]);

  const handleRedo = useCallback(() => {
    if (!project || future.length === 0) return;
    const nextSnap = future[0];
    const currentSnap: HistorySnapshot = {
      layers: project.layers.map((l) => ({ ...l })),
      frames: project.frames.map((f) => ({ ...f, cels: { ...f.cels } })),
      currentFrameIndex,
      activeLayerId,
    };
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, currentSnap]);
    setProject((p) => (p ? { ...p, layers: nextSnap.layers, frames: nextSnap.frames } : p));
    setCurrentFrameIndex(Math.min(nextSnap.currentFrameIndex, nextSnap.frames.length - 1));
    setActiveLayerId(nextSnap.activeLayerId);
  }, [project, future, currentFrameIndex, activeLayerId]);

  // Stop audio playback helper
  const stopAudioSource = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // Ignore already stopped
      }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
  }, []);

  // Playback engine (frames + synchronized audio)
  useEffect(() => {
    if (!isPlaying || !project) {
      stopAudioSource();
      return;
    }

    let rafId = 0;
    let idx = currentFrameIndex;
    let lastTick = performance.now();

    // Start synchronized audio if present
    if (project.audio && !project.audio.muted && audioBufferRef.current) {
      try {
        const ctx = getAudioContext();
        const src = ctx.createBufferSource();
        src.buffer = audioBufferRef.current;
        src.loop = loop;
        const gain = ctx.createGain();
        gain.gain.value = project.audio.volume;
        src.connect(gain);
        gain.connect(ctx.destination);

        // Compute offset in seconds up to currentFrameIndex
        let offsetFrames = 0;
        for (let i = 0; i < idx; i++) {
          offsetFrames += project.frames[i]?.hold || 1;
        }
        const offsetSec = (offsetFrames / project.fps) % audioBufferRef.current.duration;
        src.start(0, offsetSec);
        audioSourceRef.current = src;
      } catch {
        // Ignore audio context autoplay restrictions
      }
    }

    const step = (now: number) => {
      const currentFrame = project.frames[idx];
      const frameDurationMs = (1000 / project.fps) * (currentFrame?.hold || 1);
      if (now - lastTick >= frameDurationMs) {
        lastTick = now;
        if (idx + 1 < project.frames.length) {
          idx += 1;
          setCurrentFrameIndex(idx);
        } else if (loop) {
          idx = 0;
          setCurrentFrameIndex(0);
        } else {
          setIsPlaying(false);
          return;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      stopAudioSource();
    };
  }, [isPlaying, project?.fps, project?.frames, project?.audio, loop, stopAudioSource]);

  const handleTogglePlay = useCallback(() => {
    if (!isPlaying && project) {
      if (project.frames.length <= 1 && !project.audio) {
        notify('Only 1 frame in timeline — click + Frame to add frames to animate.');
      } else if (!loop && currentFrameIndex >= project.frames.length - 1) {
        setCurrentFrameIndex(0);
      }
    }
    setIsPlaying((p) => !p);
  }, [isPlaying, project, loop, currentFrameIndex, notify]);

  const handleStepFrame = useCallback(
    (delta: number) => {
      if (!project) return;
      setIsPlaying(false);
      setCurrentFrameIndex((idx) => {
        const next = idx + delta;
        if (next < 0) return project.frames.length - 1;
        if (next >= project.frames.length) return 0;
        return next;
      });
    },
    [project]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          // Only toggle playback on Space tap if not holding pan? Let's use Enter or P, or Space when not drawing
          break;
        case 'p':
          e.preventDefault();
          handleTogglePlay();
          break;
        case ',':
        case 'arrowleft':
          e.preventDefault();
          handleStepFrame(-1);
          break;
        case '.':
        case 'arrowright':
          e.preventDefault();
          handleStepFrame(1);
          break;
        case 'b':
          setActiveTool('pen');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'f':
          setActiveTool('fill');
          break;
        case 's':
          setActiveTool('select');
          break;
        case 'u':
          setActiveTool('shape');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'i':
          setActiveTool('eyedropper');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'o':
          setProject((p) =>
            p ? { ...p, onionSkin: { ...p.onionSkin, enabled: !p.onionSkin.enabled } } : p
          );
          break;
        case 'g':
          setShowGrid((g) => !g);
          break;
        case '[':
          setBrush((b) => ({ ...b, size: Math.max(1, b.size - 2) }));
          break;
        case ']':
          setBrush((b) => ({ ...b, size: Math.min(80, b.size + 2) }));
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, handleTogglePlay, handleStepFrame]);

  // Cel commit from CanvasStage
  const handleCommitCel = useCallback(
    (layerId: string, dataUrl: string) => {
      setProject((prev) => {
        if (!prev) return prev;
        pushHistory(prev);
        const nextFrames = prev.frames.map((frame, idx) =>
          idx === currentFrameIndex
            ? { ...frame, cels: { ...frame.cels, [layerId]: dataUrl } }
            : frame
        );
        return { ...prev, frames: nextFrames };
      });
    },
    [currentFrameIndex, pushHistory]
  );

  // Brush & Recent Color tracking
  const handleChangeBrush = useCallback((patch: Partial<BrushSettings>) => {
    setBrush((b) => ({ ...b, ...patch }));
    if (patch.color) {
      const col = patch.color;
      setRecentColors((prev) => [col, ...prev.filter((c) => c.toLowerCase() !== col.toLowerCase())].slice(0, 8));
    }
  }, []);

  // Frame Manager operations
  const handleAddFrame = () => {
    if (!project) return;
    pushHistory(project);
    const newFrame: FrameData = {
      id: `frame_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cels: {},
    };
    const nextFrames = [...project.frames];
    nextFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setProject({ ...project, frames: nextFrames });
    setCurrentFrameIndex(currentFrameIndex + 1);
  };

  const handleDuplicateFrame = (index: number) => {
    if (!project) return;
    pushHistory(project);
    const src = project.frames[index];
    const dup: FrameData = {
      id: `frame_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cels: { ...src.cels },
      viseme: src.viseme,
      hold: src.hold,
    };
    const nextFrames = [...project.frames];
    nextFrames.splice(index + 1, 0, dup);
    setProject({ ...project, frames: nextFrames });
    setCurrentFrameIndex(index + 1);
    notify('Frame duplicated');
  };

  const handleDeleteFrame = (index: number) => {
    if (!project || project.frames.length <= 1) return;
    pushHistory(project);
    const nextFrames = project.frames.filter((_, i) => i !== index);
    setProject({ ...project, frames: nextFrames });
    setCurrentFrameIndex(Math.min(index, nextFrames.length - 1));
  };

  const handleMoveFrame = (index: number, delta: number) => {
    if (!project) return;
    const target = index + delta;
    if (target < 0 || target >= project.frames.length) return;
    pushHistory(project);
    const nextFrames = [...project.frames];
    const [moved] = nextFrames.splice(index, 1);
    nextFrames.splice(target, 0, moved);
    setProject({ ...project, frames: nextFrames });
    setCurrentFrameIndex(target);
  };

  const handleCopyFrame = (index: number) => {
    if (!project) return;
    setCopiedFrame({
      ...project.frames[index],
      cels: { ...project.frames[index].cels },
    });
    notify(`Copied frame ${index + 1}`);
  };

  const handlePasteFrame = (index: number) => {
    if (!project || !copiedFrame) return;
    pushHistory(project);
    const pasted: FrameData = {
      id: `frame_${Date.now()}`,
      cels: { ...copiedFrame.cels },
      viseme: copiedFrame.viseme,
      hold: copiedFrame.hold,
    };
    const nextFrames = [...project.frames];
    nextFrames.splice(index + 1, 0, pasted);
    setProject({ ...project, frames: nextFrames });
    setCurrentFrameIndex(index + 1);
    notify('Pasted frame');
  };

  const handleSetFrameHold = (index: number, hold: number) => {
    if (!project) return;
    pushHistory(project);
    const nextFrames = project.frames.map((f, i) => (i === index ? { ...f, hold } : f));
    setProject({ ...project, frames: nextFrames });
  };

  // Layer Manager operations
  const handleAddLayer = () => {
    if (!project) return;
    pushHistory(project);
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: `Layer ${project.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
    };
    setProject({ ...project, layers: [...project.layers, newLayer] });
    setActiveLayerId(newLayer.id);
  };

  const handleDuplicateLayer = (id: string) => {
    if (!project) return;
    const idx = project.layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    pushHistory(project);
    const orig = project.layers[idx];
    const newId = `layer_${Date.now()}`;
    const copy: Layer = { ...orig, id: newId, name: `${orig.name} Copy` };
    const nextLayers = [...project.layers];
    nextLayers.splice(idx + 1, 0, copy);
    const nextFrames = project.frames.map((f) => ({
      ...f,
      cels: f.cels[id] ? { ...f.cels, [newId]: f.cels[id] } : { ...f.cels },
    }));
    setProject({ ...project, layers: nextLayers, frames: nextFrames });
    setActiveLayerId(newId);
  };

  const handleDeleteLayer = (id: string) => {
    if (!project || project.layers.length <= 1) return;
    pushHistory(project);
    const idx = project.layers.findIndex((l) => l.id === id);
    const nextLayers = project.layers.filter((l) => l.id !== id);
    const nextFrames = project.frames.map((f) => {
      const cels = { ...f.cels };
      delete cels[id];
      return { ...f, cels };
    });
    setProject({ ...project, layers: nextLayers, frames: nextFrames });
    if (activeLayerId === id) {
      setActiveLayerId(nextLayers[Math.max(0, idx - 1)]?.id || nextLayers[0].id);
    }
  };

  const handleUpdateLayer = (id: string, patch: Partial<Layer>) => {
    if (!project) return;
    setProject({
      ...project,
      layers: project.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    if (!project) return;
    const idx = project.layers.findIndex((l) => l.id === id);
    const target = direction === 'up' ? idx + 1 : idx - 1;
    if (idx === -1 || target < 0 || target >= project.layers.length) return;
    pushHistory(project);
    const nextLayers = [...project.layers];
    const [moved] = nextLayers.splice(idx, 1);
    nextLayers.splice(target, 0, moved);
    setProject({ ...project, layers: nextLayers });
  };

  const handleMergeLayerDown = async (id: string) => {
    if (!project) return;
    const idx = project.layers.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    const topLayer = project.layers[idx];
    const bottomLayer = project.layers[idx - 1];
    pushHistory(project);

    const nextFrames: FrameData[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext('2d')!;

    for (const frame of project.frames) {
      ctx.clearRect(0, 0, project.width, project.height);
      const bottomUrl = frame.cels[bottomLayer.id];
      if (bottomUrl) {
        const bImg = await loadImage(bottomUrl).catch(() => null);
        if (bImg) ctx.drawImage(bImg, 0, 0, project.width, project.height);
      }
      const topUrl = frame.cels[topLayer.id];
      if (topUrl) {
        const tImg = await loadImage(topUrl).catch(() => null);
        if (tImg) {
          ctx.save();
          ctx.globalAlpha = topLayer.opacity;
          ctx.globalCompositeOperation = topLayer.blendMode;
          ctx.drawImage(tImg, 0, 0, project.width, project.height);
          ctx.restore();
        }
      }
      const cels = { ...frame.cels };
      delete cels[topLayer.id];
      cels[bottomLayer.id] = canvas.toDataURL('image/png');
      nextFrames.push({ ...frame, cels });
    }

    const nextLayers = project.layers.filter((l) => l.id !== topLayer.id);
    setProject({ ...project, layers: nextLayers, frames: nextFrames });
    setActiveLayerId(bottomLayer.id);
    notify(`Merged "${topLayer.name}" down`);
  };

  // Audio & Lip Sync Handlers
  const handleUploadAudio = async (file: File) => {
    try {
      const audioTrack = await processUploadedAudioFile(file);
      setProject((p) => (p ? { ...p, audio: audioTrack } : p));
      notify(`Loaded audio "${audioTrack.name}"`);
    } catch {
      notify('Could not decode audio file.');
    }
  };

  const handleGenerateDemoAudio = async () => {
    try {
      const demo = await generateDemoVoiceTrack();
      setProject((p) => (p ? { ...p, audio: demo } : p));
      notify('Loaded Demo Voice Clip');
    } catch {
      notify('Could not synthesize demo audio.');
    }
  };

  const ensureLipSyncLayer = (proj: AnimationProject): { layers: Layer[]; lipLayerId: string } => {
    const existing = proj.layers.find((l) => l.name === 'Lip Sync Mouth');
    if (existing) return { layers: proj.layers, lipLayerId: existing.id };
    const newLayer: Layer = {
      id: `layer_lipsync_${Date.now()}`,
      name: 'Lip Sync Mouth',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
    };
    return { layers: [...proj.layers, newLayer], lipLayerId: newLayer.id };
  };

  const renderMouthDataUrl = (
    viseme: VisemeType,
    w: number,
    h: number,
    mx: number,
    my: number,
    scale: number
  ): string => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    drawVisemeMouth(ctx, viseme, mx, my, scale);
    return c.toDataURL('image/png');
  };

  const handleAutoLipSync = async (mouthX: number, mouthY: number, mouthScale: number) => {
    if (!project?.audio) return;
    try {
      const buffer = audioBufferRef.current || (await decodeAudioDataUrl(project.audio.dataUrl));
      pushHistory(project);

      // Ensure enough frames to cover audio or analyze current frame span
      const neededFrames = Math.max(
        project.frames.length,
        Math.min(60, Math.ceil(buffer.duration * project.fps))
      );
      const visemes = analyzeAudioToVisemes(buffer, project.fps, neededFrames);
      const { layers: nextLayers, lipLayerId } = ensureLipSyncLayer(project);

      const nextFrames: FrameData[] = [];
      for (let i = 0; i < neededFrames; i++) {
        const baseFrame = project.frames[i] || {
          id: `frame_lip_${Date.now()}_${i}`,
          cels: { ...project.frames[project.frames.length - 1]?.cels },
        };
        const viseme = visemes[i];
        const mouthUrl = renderMouthDataUrl(
          viseme,
          project.width,
          project.height,
          mouthX,
          mouthY,
          mouthScale
        );
        nextFrames.push({
          ...baseFrame,
          viseme,
          cels: {
            ...baseFrame.cels,
            [lipLayerId]: mouthUrl,
          },
        });
      }

      setProject({ ...project, layers: nextLayers, frames: nextFrames });
      setActiveLayerId(lipLayerId);
      notify(`Synced ${neededFrames} frames to audio!`);
    } catch {
      notify('Lip-sync analysis failed.');
    }
  };

  const handleAssignFrameViseme = (
    viseme: VisemeType,
    mouthX: number,
    mouthY: number,
    mouthScale: number
  ) => {
    if (!project) return;
    pushHistory(project);
    const { layers: nextLayers, lipLayerId } = ensureLipSyncLayer(project);
    const mouthUrl = renderMouthDataUrl(
      viseme,
      project.width,
      project.height,
      mouthX,
      mouthY,
      mouthScale
    );
    const nextFrames = project.frames.map((f, idx) =>
      idx === currentFrameIndex
        ? {
            ...f,
            viseme,
            cels: { ...f.cels, [lipLayerId]: mouthUrl },
          }
        : f
    );
    setProject({ ...project, layers: nextLayers, frames: nextFrames });
    setActiveLayerId(lipLayerId);
  };

  const handleApplyScreenSheet = useCallback(
    (preset: ScreenSheetPreset) => {
      if (!project) return;
      setProject({
        ...project,
        width: preset.width,
        height: preset.height,
        fps: preset.fps,
        screenSheetId: preset.id,
      });
      setShowSafeZones(true);
      setAutoFitZoom(true);
      fitCanvasToViewport(preset.width, preset.height);
      notify(`Applied ${preset.name} (${preset.width}×${preset.height})`);
    },
    [project, fitCanvasToViewport, notify]
  );

  const handleCreateNewFromSheet = useCallback(
    async (preset: ScreenSheetPreset) => {
      const fresh = createBlankProject(
        preset.name,
        preset.width,
        preset.height,
        preset.fps,
        '#FAF9F6',
        preset.id
      );
      await saveProjectToDB(fresh).catch(() => undefined);
      setIsPlaying(false);
      setPast([]);
      setFuture([]);
      setProject(fresh);
      setCurrentFrameIndex(0);
      setActiveLayerId(fresh.layers[fresh.layers.length - 1]?.id || '');
      setShowSafeZones(true);
      fitCanvasToViewport(fresh.width, fresh.height);
      notify(`Created "${preset.name}" screen sheet`);
    },
    [fitCanvasToViewport, notify]
  );

  const handleEnterStudio = useCallback(
    (options?: {
      layout?: WorkspaceLayout;
      blankPreset?: {
        name: string;
        width: number;
        height: number;
        fps: number;
        screenSheetId?: string;
      };
    }) => {
      if (options?.layout) {
        handleChangeLayout(options.layout);
      }
      setPendingPreset({
        ...(options?.blankPreset || {}),
        layout: options?.layout,
      });
      setViewMode('new-project');
      window.scrollTo({ top: 0 });
    },
    [handleChangeLayout]
  );

  const handleCreateFromSetup = useCallback(
    async (params: {
      name: string;
      fps: number;
      width: number;
      height: number;
      backgroundColor: string;
      screenSheetId?: string;
      layout?: WorkspaceLayout;
    }) => {
      const targetLayout = params.layout || layout;
      if (params.layout) {
        handleChangeLayout(params.layout);
      }
      const fresh = createBlankProject(
        params.name,
        params.width,
        params.height,
        params.fps,
        params.backgroundColor,
        params.screenSheetId
      );
      await saveProjectToDB(fresh).catch(() => undefined);
      setHasSavedProjects(true);
      setIsPlaying(false);
      setPast([]);
      setFuture([]);
      setProject(fresh);
      setCurrentFrameIndex(0);
      setActiveLayerId(fresh.layers[fresh.layers.length - 1]?.id || '');
      setShowSafeZones(Boolean(params.screenSheetId));
      setAutoFitZoom(true);
      fitCanvasToViewport(fresh.width, fresh.height, targetLayout);
      setViewMode('studio');
      window.scrollTo({ top: 0 });
      notify(`Created "${fresh.name}" (${fresh.width}×${fresh.height} · ${fresh.fps} FPS)`);
    },
    [layout, handleChangeLayout, fitCanvasToViewport, notify]
  );

  const handleOpenExistingFromSetup = useCallback(
    (loaded: AnimationProject, targetLayout?: WorkspaceLayout) => {
      const activeLayout = targetLayout || layout;
      if (targetLayout) {
        handleChangeLayout(targetLayout);
      }
      setIsPlaying(false);
      setPast([]);
      setFuture([]);
      setProject(loaded);
      setCurrentFrameIndex(0);
      setActiveLayerId(loaded.layers[loaded.layers.length - 1]?.id || '');
      setShowSafeZones(Boolean(loaded.screenSheetId));
      setAutoFitZoom(true);
      fitCanvasToViewport(loaded.width, loaded.height, activeLayout);
      setViewMode('studio');
      window.scrollTo({ top: 0 });
    },
    [layout, handleChangeLayout, fitCanvasToViewport]
  );

  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          hasSavedProjects={hasSavedProjects}
          onEnterStudio={handleEnterStudio}
          onOpenDesktopApp={() => setShowDesktopModal(true)}
        />
        {showDesktopModal && (
          <DesktopAppModal onClose={() => setShowDesktopModal(false)} onNotify={notify} />
        )}
        <OfflineIndicator />
      </>
    );
  }

  if (viewMode === 'new-project') {
    return (
      <>
        <NewProjectSetup
          initialPreset={pendingPreset}
          onBackToLanding={() => {
            setViewMode('landing');
            window.scrollTo({ top: 0 });
          }}
          onCreateProject={handleCreateFromSetup}
          onOpenExistingProject={handleOpenExistingFromSetup}
          onNotify={notify}
        />
        {toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-lg bg-[#232836] border border-[#3A4154] text-xs font-medium text-[#F4F5F7] shadow-xl pointer-events-none">
            {toastMsg}
          </div>
        )}
        <OfflineIndicator />
      </>
    );
  }

  if (!project) {
    return (
      <div className="h-screen w-screen bg-[#111318] flex items-center justify-center text-sm text-[#9CA3AF]">
        Loading CelDraft Studio...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#111318] text-[#F4F5F7] overflow-hidden">
      {/* Top Studio Bar */}
      <TopBar
        projectName={project.name}
        onRenameProject={(name) => setProject({ ...project, name })}
        onOpenProjects={() => setShowProjectsModal(true)}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        loop={loop}
        onToggleLoop={() => setLoop((l) => !l)}
        fps={project.fps}
        onChangeFps={(fps) => setProject({ ...project, fps })}
        currentFrameIndex={currentFrameIndex}
        totalFrames={project.frames.length}
        onStepFrame={handleStepFrame}
        onionSkinEnabled={project.onionSkin.enabled}
        onToggleOnionSkin={() =>
          setProject({
            ...project,
            onionSkin: { ...project.onionSkin, enabled: !project.onionSkin.enabled },
          })
        }
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((g) => !g)}
        showSafeZones={showSafeZones}
        onToggleSafeZones={() => setShowSafeZones((s) => !s)}
        zoom={zoom}
        onZoomChange={(nextZoom) => {
          setAutoFitZoom(false);
          setZoom(nextZoom);
        }}
        onFitZoom={() => {
          setAutoFitZoom(true);
          fitCanvasToViewport(project.width, project.height);
        }}
        layout={layout}
        onChangeLayout={handleChangeLayout}
        onOpenSheets={() => setShowSheetsModal(true)}
        onOpenDesktopApp={() => setShowDesktopModal(true)}
        onOpenCreateVideo={() => {
          setIsPlaying(false);
          setExportInitialTab('video');
          setShowExportModal(true);
        }}
        onOpenExport={() => {
          setIsPlaying(false);
          setExportInitialTab('gif');
          setShowExportModal(true);
        }}
        onGoHome={() => {
          setIsPlaying(false);
          setHasSavedProjects(true);
          setViewMode('landing');
        }}
        saveStatus={saveStatus}
      />

      {/* Middle Studio Workspace (adapts to selected Display Layout) */}
      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {layout === 'mirrored' && (
          <RightInspector
            side="left"
            layers={project.layers}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onAddLayer={handleAddLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
            onUpdateLayer={handleUpdateLayer}
            onMoveLayer={handleMoveLayer}
            onMergeLayerDown={handleMergeLayerDown}
            audio={project.audio}
            onUploadAudio={handleUploadAudio}
            onGenerateDemoAudio={handleGenerateDemoAudio}
            onUpdateAudio={(patch: Partial<AudioTrackData>) =>
              setProject((p) => (p && p.audio ? { ...p, audio: { ...p.audio, ...patch } } : p))
            }
            onRemoveAudio={() => setProject((p) => (p ? { ...p, audio: null } : p))}
            currentViseme={project.frames[currentFrameIndex]?.viseme}
            onAutoLipSync={handleAutoLipSync}
            onAssignFrameViseme={handleAssignFrameViseme}
            width={project.width}
            height={project.height}
            backgroundColor={project.backgroundColor}
            screenSheetId={project.screenSheetId}
            showSafeZones={showSafeZones}
            onToggleSafeZones={() => setShowSafeZones((s) => !s)}
            onOpenSheets={() => setShowSheetsModal(true)}
            onChangeStage={handleChangeStage}
            onionSkin={project.onionSkin}
            onChangeOnionSkin={(patch: Partial<OnionSkinSettings>) =>
              setProject({ ...project, onionSkin: { ...project.onionSkin, ...patch } })
            }
          />
        )}

        {layout !== 'mirrored' && (
          <LeftToolbar
            compact={layout === 'focus'}
            side="left"
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            brush={brush}
            onChangeBrush={handleChangeBrush}
            shape={shape}
            onChangeShape={(patch) => setShape((s) => ({ ...s, ...patch }))}
            recentColors={recentColors}
          />
        )}

        <div className="relative flex-1 flex min-w-0 min-h-0">
          <CanvasStage
            width={project.width}
            height={project.height}
            backgroundColor={project.backgroundColor}
            layers={project.layers}
            frames={project.frames}
            currentFrameIndex={currentFrameIndex}
            activeLayerId={activeLayerId}
            onionSkin={project.onionSkin}
            isPlaying={isPlaying}
            showGrid={showGrid}
            showSafeZones={showSafeZones}
            screenSheetId={project.screenSheetId}
            activeTool={activeTool}
            brush={brush}
            shape={shape}
            zoom={zoom}
            pan={pan}
            onZoomChange={(nextZoom) => {
              setAutoFitZoom(false);
              setZoom(nextZoom);
            }}
            onPanChange={setPan}
            onCommitCel={handleCommitCel}
            onPickColor={(hex) => handleChangeBrush({ color: hex })}
            onNotify={notify}
          />

          {/* Focus Layout Floating Inspector Toggle */}
          {layout === 'focus' && (
            <button
              type="button"
              onClick={() => setFocusInspectorOpen((o) => !o)}
              className={`absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                focusInspectorOpen
                  ? 'bg-[#FF5A36] border-[#FF5A36] text-white'
                  : 'bg-[#181B23]/95 border-[#2E3545] text-[#D1D5DB] hover:text-white'
              }`}
            >
              {focusInspectorOpen ? 'Close Panels' : 'Layers & Stage'}
            </button>
          )}

          {layout === 'focus' && focusInspectorOpen && (
            <div className="absolute top-12 right-3 bottom-3 z-30 rounded-xl overflow-hidden border border-[#2E3545] shadow-2xl">
              <RightInspector
                side="right"
                className="border-l-0"
                layers={project.layers}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onAddLayer={handleAddLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onDeleteLayer={handleDeleteLayer}
                onUpdateLayer={handleUpdateLayer}
                onMoveLayer={handleMoveLayer}
                onMergeLayerDown={handleMergeLayerDown}
                audio={project.audio}
                onUploadAudio={handleUploadAudio}
                onGenerateDemoAudio={handleGenerateDemoAudio}
                onUpdateAudio={(patch: Partial<AudioTrackData>) =>
                  setProject((p) => (p && p.audio ? { ...p, audio: { ...p.audio, ...patch } } : p))
                }
                onRemoveAudio={() => setProject((p) => (p ? { ...p, audio: null } : p))}
                currentViseme={project.frames[currentFrameIndex]?.viseme}
                onAutoLipSync={handleAutoLipSync}
                onAssignFrameViseme={handleAssignFrameViseme}
                width={project.width}
                height={project.height}
                backgroundColor={project.backgroundColor}
                screenSheetId={project.screenSheetId}
                showSafeZones={showSafeZones}
                onToggleSafeZones={() => setShowSafeZones((s) => !s)}
                onOpenSheets={() => setShowSheetsModal(true)}
                onChangeStage={handleChangeStage}
                onionSkin={project.onionSkin}
                onChangeOnionSkin={(patch: Partial<OnionSkinSettings>) =>
                  setProject({ ...project, onionSkin: { ...project.onionSkin, ...patch } })
                }
              />
            </div>
          )}
        </div>

        {layout === 'mirrored' && (
          <LeftToolbar
            side="right"
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            brush={brush}
            onChangeBrush={handleChangeBrush}
            shape={shape}
            onChangeShape={(patch) => setShape((s) => ({ ...s, ...patch }))}
            recentColors={recentColors}
          />
        )}

        {layout === 'studio' && (
          <RightInspector
            side="right"
            layers={project.layers}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onAddLayer={handleAddLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
            onUpdateLayer={handleUpdateLayer}
            onMoveLayer={handleMoveLayer}
            onMergeLayerDown={handleMergeLayerDown}
            audio={project.audio}
            onUploadAudio={handleUploadAudio}
            onGenerateDemoAudio={handleGenerateDemoAudio}
            onUpdateAudio={(patch: Partial<AudioTrackData>) =>
              setProject((p) => (p && p.audio ? { ...p, audio: { ...p.audio, ...patch } } : p))
            }
            onRemoveAudio={() => setProject((p) => (p ? { ...p, audio: null } : p))}
            currentViseme={project.frames[currentFrameIndex]?.viseme}
            onAutoLipSync={handleAutoLipSync}
            onAssignFrameViseme={handleAssignFrameViseme}
            width={project.width}
            height={project.height}
            backgroundColor={project.backgroundColor}
            screenSheetId={project.screenSheetId}
            showSafeZones={showSafeZones}
            onToggleSafeZones={() => setShowSafeZones((s) => !s)}
            onOpenSheets={() => setShowSheetsModal(true)}
            onChangeStage={handleChangeStage}
            onionSkin={project.onionSkin}
            onChangeOnionSkin={(patch: Partial<OnionSkinSettings>) =>
              setProject({ ...project, onionSkin: { ...project.onionSkin, ...patch } })
            }
          />
        )}

        {layout === 'storyboard' && (
          <div className="w-84 bg-[#161920] border-l border-[#262B36] flex flex-col h-full shrink-0 z-10">
            <div className="p-2 border-b border-[#262B36]">
              <div className="grid grid-cols-2 gap-1 bg-[#111318] p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStoryboardRightTab('frames')}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    storyboardRightTab === 'frames'
                      ? 'bg-[#252A36] text-[#F4F5F7]'
                      : 'text-[#8B93A5] hover:text-[#D1D5DB]'
                  }`}
                >
                  Storyboard ({project.frames.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStoryboardRightTab('inspector')}
                  className={`py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    storyboardRightTab === 'inspector'
                      ? 'bg-[#252A36] text-[#F4F5F7]'
                      : 'text-[#8B93A5] hover:text-[#D1D5DB]'
                  }`}
                >
                  Layers & Audio
                </button>
              </div>
            </div>

            {storyboardRightTab === 'frames' ? (
              <Timeline
                variant="grid"
                frames={project.frames}
                layers={project.layers}
                width={project.width}
                height={project.height}
                backgroundColor={project.backgroundColor}
                fps={project.fps}
                currentFrameIndex={currentFrameIndex}
                isPlaying={isPlaying}
                loop={loop}
                audio={project.audio}
                hasCopiedFrame={Boolean(copiedFrame)}
                onTogglePlay={handleTogglePlay}
                onToggleLoop={() => setLoop((l) => !l)}
                onStepFrame={handleStepFrame}
                onSelectFrame={(idx) => {
                  setIsPlaying(false);
                  setCurrentFrameIndex(idx);
                }}
                onAddFrame={handleAddFrame}
                onDuplicateFrame={handleDuplicateFrame}
                onDeleteFrame={handleDeleteFrame}
                onMoveFrame={handleMoveFrame}
                onCopyFrame={handleCopyFrame}
                onPasteFrame={handlePasteFrame}
                onSetFrameHold={handleSetFrameHold}
              />
            ) : (
              <RightInspector
                side="right"
                className="w-full border-l-0 flex-1 min-h-0"
                layers={project.layers}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onAddLayer={handleAddLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onDeleteLayer={handleDeleteLayer}
                onUpdateLayer={handleUpdateLayer}
                onMoveLayer={handleMoveLayer}
                onMergeLayerDown={handleMergeLayerDown}
                audio={project.audio}
                onUploadAudio={handleUploadAudio}
                onGenerateDemoAudio={handleGenerateDemoAudio}
                onUpdateAudio={(patch: Partial<AudioTrackData>) =>
                  setProject((p) => (p && p.audio ? { ...p, audio: { ...p.audio, ...patch } } : p))
                }
                onRemoveAudio={() => setProject((p) => (p ? { ...p, audio: null } : p))}
                currentViseme={project.frames[currentFrameIndex]?.viseme}
                onAutoLipSync={handleAutoLipSync}
                onAssignFrameViseme={handleAssignFrameViseme}
                width={project.width}
                height={project.height}
                backgroundColor={project.backgroundColor}
                screenSheetId={project.screenSheetId}
                showSafeZones={showSafeZones}
                onToggleSafeZones={() => setShowSafeZones((s) => !s)}
                onOpenSheets={() => setShowSheetsModal(true)}
                onChangeStage={handleChangeStage}
                onionSkin={project.onionSkin}
                onChangeOnionSkin={(patch: Partial<OnionSkinSettings>) =>
                  setProject({ ...project, onionSkin: { ...project.onionSkin, ...patch } })
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom Timeline & Frame Manager (hidden when docked in Storyboard Grid) */}
      {layout !== 'storyboard' && (
        <Timeline
          variant={layout === 'focus' ? 'compact' : 'strip'}
          frames={project.frames}
          layers={project.layers}
          width={project.width}
          height={project.height}
          backgroundColor={project.backgroundColor}
          fps={project.fps}
          currentFrameIndex={currentFrameIndex}
          isPlaying={isPlaying}
          loop={loop}
          audio={project.audio}
          hasCopiedFrame={Boolean(copiedFrame)}
          onTogglePlay={handleTogglePlay}
          onToggleLoop={() => setLoop((l) => !l)}
          onStepFrame={handleStepFrame}
          onSelectFrame={(idx) => {
            setIsPlaying(false);
            setCurrentFrameIndex(idx);
          }}
          onAddFrame={handleAddFrame}
          onDuplicateFrame={handleDuplicateFrame}
          onDeleteFrame={handleDeleteFrame}
          onMoveFrame={handleMoveFrame}
          onCopyFrame={handleCopyFrame}
          onPasteFrame={handlePasteFrame}
          onSetFrameHold={handleSetFrameHold}
        />
      )}

      {/* Export & Video Creation Studio Modal */}
      {showExportModal && (
        <ExportModal
          project={project}
          currentFrameIndex={currentFrameIndex}
          initialTab={exportInitialTab}
          onClose={() => setShowExportModal(false)}
          onNotify={notify}
        />
      )}

      {/* Projects Hub Modal */}
      {showProjectsModal && (
        <ProjectsModal
          activeProjectId={project.id}
          onSelectProject={(loaded) => {
            setIsPlaying(false);
            setPast([]);
            setFuture([]);
            setProject(loaded);
            setCurrentFrameIndex(0);
            setActiveLayerId(loaded.layers[loaded.layers.length - 1]?.id || '');
            fitCanvasToViewport(loaded.width, loaded.height);
          }}
          onClose={() => setShowProjectsModal(false)}
          onNotify={notify}
        />
      )}

      {/* Animation Screen Sheets Modal (YouTube, TikTok, Instagram, Cinema, Game Dev) */}
      {showSheetsModal && (
        <ScreenSheetsModal
          currentWidth={project.width}
          currentHeight={project.height}
          currentScreenSheetId={project.screenSheetId}
          onApplyToCurrent={handleApplyScreenSheet}
          onCreateNewFromSheet={handleCreateNewFromSheet}
          onClose={() => setShowSheetsModal(false)}
        />
      )}

      {/* Offline & Windows Desktop (.exe) Modal */}
      {showDesktopModal && (
        <DesktopAppModal onClose={() => setShowDesktopModal(false)} onNotify={notify} />
      )}

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Non-intrusive Studio Toast */}
      {toastMsg && (
        <div className="fixed bottom-52 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-lg bg-[#232836] border border-[#3A4154] text-xs font-medium text-[#F4F5F7] shadow-xl pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
