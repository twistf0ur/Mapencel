import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Film,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { AnimationProject, ProjectSummary, WorkspaceLayout } from '../types/animation';
import { SCREEN_SHEET_PRESETS } from '../utils/screenSheets';
import {
  deleteProjectFromDB,
  listProjectSummaries,
  loadProjectFromDB,
  saveProjectToDB,
} from '../utils/storage';

interface NewProjectSetupProps {
  initialPreset?: {
    name?: string;
    width?: number;
    height?: number;
    fps?: number;
    screenSheetId?: string;
    layout?: WorkspaceLayout;
  };
  onBackToLanding: () => void;
  onCreateProject: (params: {
    name: string;
    fps: number;
    width: number;
    height: number;
    backgroundColor: string;
    screenSheetId?: string;
    layout?: WorkspaceLayout;
  }) => void;
  onOpenExistingProject: (project: AnimationProject, layout?: WorkspaceLayout) => void;
  onNotify: (msg: string) => void;
}

export const NewProjectSetup: React.FC<NewProjectSetupProps> = ({
  initialPreset,
  onBackToLanding,
  onCreateProject,
  onOpenExistingProject,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'saved'>('new');

  // Form fields: Name, FPS, Window Size
  const [name, setName] = useState<string>(initialPreset?.name || 'Untitled Animation');
  const [fps, setFps] = useState<number>(initialPreset?.fps || 24);
  const [selectedSheetId, setSelectedSheetId] = useState<string>(
    initialPreset?.screenSheetId || 'youtube-hd'
  );
  const [width, setWidth] = useState<number>(initialPreset?.width || 1280);
  const [height, setHeight] = useState<number>(initialPreset?.height || 720);
  const [widthInput, setWidthInput] = useState<string>(String(initialPreset?.width || 1280));
  const [heightInput, setHeightInput] = useState<string>(String(initialPreset?.height || 720));
  const [backgroundColor, setBackgroundColor] = useState<string>('#FAF9F6');

  // Saved projects list for the second tab
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(true);
  const importRef = useRef<HTMLInputElement>(null);

  const refreshSaved = async () => {
    setLoadingSaved(true);
    try {
      const list = await listProjectSummaries();
      setSummaries(list);
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => {
    refreshSaved();
  }, []);

  // Sync initialPreset if navigated from a specific landing card
  useEffect(() => {
    if (!initialPreset) return;
    if (initialPreset.name) setName(initialPreset.name);
    if (initialPreset.width) {
      setWidth(initialPreset.width);
      setWidthInput(String(initialPreset.width));
    }
    if (initialPreset.height) {
      setHeight(initialPreset.height);
      setHeightInput(String(initialPreset.height));
    }
    if (initialPreset.fps) setFps(initialPreset.fps);
    if (initialPreset.screenSheetId) setSelectedSheetId(initialPreset.screenSheetId);
  }, [initialPreset]);

  const handleSelectSheet = (sheetId: string) => {
    if (sheetId === 'custom') {
      setSelectedSheetId('custom');
      return;
    }
    const preset = SCREEN_SHEET_PRESETS.find((s) => s.id === sheetId);
    if (!preset) return;
    setSelectedSheetId(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
    setWidthInput(String(preset.width));
    setHeightInput(String(preset.height));
    setFps(preset.fps);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clampedW = Math.max(128, Math.min(3840, Math.round(Number(widthInput) || width || 1280)));
    const clampedH = Math.max(128, Math.min(3840, Math.round(Number(heightInput) || height || 720)));
    onCreateProject({
      name: name.trim() || 'Untitled Animation',
      fps: Math.max(1, Math.min(30, fps || 12)),
      width: clampedW,
      height: clampedH,
      backgroundColor,
      screenSheetId: selectedSheetId === 'custom' ? undefined : selectedSheetId,
      layout: initialPreset?.layout,
    });
  };

  const handleOpenSaved = async (id: string) => {
    const proj = await loadProjectFromDB(id);
    if (proj) {
      onOpenExistingProject(proj, initialPreset?.layout);
    }
  };

  const handleDuplicateSaved = async (id: string) => {
    const orig = await loadProjectFromDB(id);
    if (!orig) return;
    const now = Date.now();
    const copy: AnimationProject = {
      ...orig,
      id: `proj_${now}`,
      name: `${orig.name} Copy`,
      createdAt: now,
      updatedAt: now,
    };
    await saveProjectToDB(copy);
    await refreshSaved();
    onNotify(`Duplicated "${orig.name}"`);
  };

  const handleDeleteSaved = async (id: string, title: string) => {
    await deleteProjectFromDB(id);
    await refreshSaved();
    onNotify(`Deleted "${title}"`);
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AnimationProject;
      if (!parsed.frames || !parsed.layers || !parsed.width || !parsed.height) {
        throw new Error('Invalid CelDraft project file');
      }
      const imported: AnimationProject = {
        ...parsed,
        id: `proj_${Date.now()}`,
        updatedAt: Date.now(),
      };
      await saveProjectToDB(imported);
      onOpenExistingProject(imported, initialPreset?.layout);
      onNotify(`Imported "${imported.name}"`);
    } catch (err) {
      onNotify(`Import failed: ${err instanceof Error ? err.message : 'Invalid file'}`);
    }
  };

  // Proportional preview box calculations
  const activeSheet = SCREEN_SHEET_PRESETS.find((s) => s.id === selectedSheetId);
  const maxPreviewW = 240;
  const maxPreviewH = 180;
  const previewScale = Math.min(maxPreviewW / Math.max(1, width), maxPreviewH / Math.max(1, height));
  const previewW = Math.max(36, Math.round(width * previewScale));
  const previewH = Math.max(36, Math.round(height * previewScale));

  return (
    <div className="min-h-screen bg-[#111318] text-[#F4F5F7] flex flex-col">
      {/* Top Bar */}
      <header className="h-14 border-b border-[#232834] bg-[#161920] px-6 flex items-center justify-between gap-4 shrink-0">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F4F5F7] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="14" height="14" rx="3" stroke="#5A6377" strokeWidth="1.8" />
            <rect x="7" y="6" width="14" height="14" rx="3" fill="#161920" stroke="#FF5A36" strokeWidth="2" />
            <circle cx="14" cy="13" r="2.5" fill="#FF5A36" />
          </svg>
          <span className="font-bold text-sm tracking-tight text-[#F4F5F7]">CelDraft Setup</span>
        </div>

        <div className="w-24 hidden sm:block" />
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        {/* Segmented Tabs: New Project vs Saved Projects */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="inline-flex p-1 rounded-xl bg-[#181B23] border border-[#262C3A]">
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'new'
                  ? 'bg-[#FF5A36] text-white'
                  : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'bg-[#262C3A] text-[#F4F5F7]'
                  : 'text-[#9CA3AF] hover:text-[#F4F5F7]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Saved Projects ({summaries.length})</span>
            </button>
          </div>

          {activeTab === 'saved' && (
            <div>
              <input
                ref={importRef}
                type="file"
                accept=".json,.celdraft.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportJson(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D212B] hover:bg-[#262C3A] border border-[#2D3444] text-xs font-medium text-[#D1D5DB]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import .celdraft.json</span>
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: NEW PROJECT FORM (Name & Window Size) */}
        {activeTab === 'new' && (
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Form Card */}
            <div className="lg:col-span-7 bg-[#161920] border border-[#262C3A] rounded-xl p-6 space-y-6">
              <div>
                <h1 className="text-xl font-bold text-[#F4F5F7] mb-1">Create New Project</h1>
                <p className="text-xs text-[#9CA3AF]">
                  Set your project name, frame rate, and stage window size before drawing.
                </p>
              </div>

              {/* 1. Project Name & Frame Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-7">
                  <label
                    htmlFor="new-proj-name"
                    className="block text-xs font-semibold text-[#D1D5DB] mb-2"
                  >
                    Project Name
                  </label>
                  <input
                    id="new-proj-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Character Walk Cycle"
                    className="w-full bg-[#111318] border border-[#2D3444] focus:border-[#FF5A36] rounded-lg px-3.5 py-2 text-sm text-[#F4F5F7] outline-none transition-colors"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label
                    htmlFor="new-proj-fps"
                    className="block text-xs font-semibold text-[#D1D5DB] mb-2"
                  >
                    Frame Rate (FPS)
                  </label>
                  <input
                    id="new-proj-fps"
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={fps}
                    onChange={(e) =>
                      setFps(Math.max(1, Math.min(30, Number(e.target.value) || 12)))
                    }
                    className="w-full bg-[#111318] border border-[#2D3444] focus:border-[#FF5A36] rounded-lg px-3.5 py-2 text-sm font-mono tabular-nums text-[#F4F5F7] outline-none"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[12, 15, 24, 30].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFps(rate)}
                        className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums transition-colors ${
                          fps === rate
                            ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                            : 'bg-[#1D212B] text-[#9CA3AF] hover:text-white border border-transparent'
                        }`}
                      >
                        {rate}fps
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Window Size (Screen Sheet Presets + Custom Width/Height) */}
              <div className="pt-2 border-t border-[#232834] space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#D1D5DB] mb-2">
                    Window Size Preset
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SCREEN_SHEET_PRESETS.map((sheet) => {
                      const active = selectedSheetId === sheet.id;
                      return (
                        <button
                          key={sheet.id}
                          type="button"
                          onClick={() => handleSelectSheet(sheet.id)}
                          className={`p-2.5 rounded-lg border text-left transition-colors ${
                            active
                              ? 'bg-[#222735] border-[#FF5A36]'
                              : 'bg-[#111318] border-[#282E3C] hover:border-[#3B4459]'
                          }`}
                        >
                          <div className="text-xs font-semibold text-[#F4F5F7] truncate">
                            {sheet.name}
                          </div>
                          <div className="text-[11px] font-mono text-[#9CA3AF] tabular-nums">
                            {sheet.width}×{sheet.height} · {sheet.ratioLabel}
                          </div>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleSelectSheet('custom')}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        selectedSheetId === 'custom'
                          ? 'bg-[#222735] border-[#FF5A36]'
                          : 'bg-[#111318] border-[#282E3C] hover:border-[#3B4459]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#F4F5F7]">Custom Size</div>
                      <div className="text-[11px] font-mono text-[#9CA3AF] tabular-nums">
                        Set W × H
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom Width x Height & Paper Background */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="new-proj-width"
                      className="block text-[11px] text-[#9CA3AF] mb-1"
                    >
                      Width (px)
                    </label>
                    <input
                      id="new-proj-width"
                      type="number"
                      min={128}
                      max={3840}
                      value={widthInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setWidthInput(raw);
                        setSelectedSheetId('custom');
                        const parsed = Number(raw);
                        if (Number.isFinite(parsed) && parsed >= 64) {
                          setWidth(Math.min(3840, Math.round(parsed)));
                        }
                      }}
                      onBlur={() => {
                        const clamped = Math.max(128, Math.min(3840, Math.round(Number(widthInput) || width || 1280)));
                        setWidth(clamped);
                        setWidthInput(String(clamped));
                      }}
                      className="w-full bg-[#111318] border border-[#2D3444] rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-[#F4F5F7]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-proj-height"
                      className="block text-[11px] text-[#9CA3AF] mb-1"
                    >
                      Height (px)
                    </label>
                    <input
                      id="new-proj-height"
                      type="number"
                      min={128}
                      max={3840}
                      value={heightInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setHeightInput(raw);
                        setSelectedSheetId('custom');
                        const parsed = Number(raw);
                        if (Number.isFinite(parsed) && parsed >= 64) {
                          setHeight(Math.min(3840, Math.round(parsed)));
                        }
                      }}
                      onBlur={() => {
                        const clamped = Math.max(128, Math.min(3840, Math.round(Number(heightInput) || height || 720)));
                        setHeight(clamped);
                        setHeightInput(String(clamped));
                      }}
                      className="w-full bg-[#111318] border border-[#2D3444] rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-[#F4F5F7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#9CA3AF] mb-1">Background</label>
                    <div className="flex items-center gap-1.5 h-[34px]">
                      {['#FAF9F6', '#FFFFFF', '#18181B', 'transparent'].map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setBackgroundColor(bg)}
                          title={bg === 'transparent' ? 'Transparent' : bg}
                          className={`w-6 h-6 rounded border ${
                            bg === 'transparent' ? 'checkerboard-bg' : ''
                          } ${
                            backgroundColor === bg
                              ? 'border-[#FF5A36] ring-1 ring-[#FF5A36]'
                              : 'border-[#343B4C]'
                          }`}
                          style={bg !== 'transparent' ? { backgroundColor: bg } : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Preview & Launch Column */}
            <div className="lg:col-span-5 bg-[#161920] border border-[#262C3A] rounded-xl p-6 flex flex-col justify-between space-y-6">
              <div>
                <div className="text-xs font-semibold text-[#9CA3AF] mb-4">
                  Window Size Preview
                </div>

                <div className="h-52 rounded-xl bg-[#111318] border border-[#242A36] flex items-center justify-center p-4 mb-5">
                  <div
                    className={`relative rounded shadow-lg border border-[#32394A] overflow-hidden ${
                      backgroundColor === 'transparent' ? 'checkerboard-bg' : ''
                    }`}
                    style={{
                      width: previewW,
                      height: previewH,
                      backgroundColor: backgroundColor === 'transparent' ? undefined : backgroundColor,
                    }}
                  >
                    {activeSheet && (
                      <div
                        className="absolute border border-dashed border-[#FF5A36]/75 bg-[#38BDF8]/10"
                        style={{
                          top: `${activeSheet.safeZone.topPct * 100}%`,
                          right: `${activeSheet.safeZone.rightPct * 100}%`,
                          bottom: `${activeSheet.safeZone.bottomPct * 100}%`,
                          left: `${activeSheet.safeZone.leftPct * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Spec Summary */}
                <div className="divide-y divide-[#232834] border border-[#242A36] rounded-lg bg-[#12151B] text-xs">
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Project Name</span>
                    <span className="font-semibold text-[#F4F5F7] truncate max-w-[180px]">
                      {name.trim() || 'Untitled Animation'}
                    </span>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Window Size</span>
                    <span className="font-mono text-[#F4F5F7] tabular-nums">
                      {width} × {height} px
                    </span>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Frame Rate</span>
                    <span className="font-mono text-[#F4F5F7] tabular-nums">{fps} FPS</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Create Project & Open Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: SAVED PROJECTS */}
        {activeTab === 'saved' && (
          <div>
            {loadingSaved ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-48 rounded-xl bg-[#181B23] animate-pulse" />
                ))}
              </div>
            ) : summaries.length === 0 ? (
              <div className="rounded-xl border border-[#262C3A] bg-[#161920] p-12 text-center">
                <Film className="w-8 h-8 text-[#6B7280] mx-auto mb-3" />
                <div className="text-sm font-semibold text-[#F4F5F7] mb-1">
                  No saved projects yet
                </div>
                <p className="text-xs text-[#9CA3AF] mb-4">
                  Switch to the New Project tab to configure your project name and window size.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className="px-4 py-2 rounded-lg bg-[#FF5A36] text-xs font-semibold text-white"
                >
                  Create New Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {summaries.map((proj) => (
                  <div
                    key={proj.id}
                    className="rounded-xl border border-[#282E3C] hover:border-[#FF5A36]/70 bg-[#161920] overflow-hidden flex flex-col transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenSaved(proj.id)}
                      className="h-32 w-full bg-[#111318] border-b border-[#242A36] flex items-center justify-center overflow-hidden"
                    >
                      {proj.thumbnailUrl ? (
                        <img
                          src={proj.thumbnailUrl}
                          alt={proj.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#6B7280]">Empty Stage</span>
                      )}
                    </button>
                    <div className="p-3.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSaved(proj.id)}
                        className="min-w-0 text-left flex-1"
                      >
                        <div className="text-sm font-semibold text-[#F4F5F7] truncate">
                          {proj.name}
                        </div>
                        <div className="text-xs font-mono text-[#8B93A5] tabular-nums">
                          {proj.frameCount}f · {proj.fps}fps · {proj.width}×{proj.height}
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDuplicateSaved(proj.id)}
                          title="Duplicate"
                          className="p-1.5 rounded hover:bg-[#252A36] text-[#9CA3AF] hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSaved(proj.id, proj.name)}
                          title="Delete"
                          className="p-1.5 rounded hover:bg-[#F43F5E]/20 text-[#9CA3AF] hover:text-[#F43F5E]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
