import React, { useEffect, useRef, useState } from 'react';
import { Copy, FolderPlus, Plus, Trash2, Upload, X } from 'lucide-react';
import { AnimationProject, ProjectSummary } from '../types/animation';
import {
  deleteProjectFromDB,
  listProjectSummaries,
  loadProjectFromDB,
  saveProjectToDB,
} from '../utils/storage';
import { createBlankProject } from '../utils/starterProject';
import { SCREEN_SHEET_PRESETS } from '../utils/screenSheets';

interface ProjectsModalProps {
  activeProjectId: string;
  onSelectProject: (project: AnimationProject) => void;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  activeProjectId,
  onSelectProject,
  onClose,
  onNotify,
}) => {
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  const [newName, setNewName] = useState('New Animation');
  const [newSheetId, setNewSheetId] = useState('youtube-hd');
  const [newFps, setNewFps] = useState(24);
  const [newBg, setNewBg] = useState('#FAF9F6');

  const importRef = useRef<HTMLInputElement>(null);

  const refreshList = async () => {
    setLoading(true);
    try {
      const items = await listProjectSummaries();
      setSummaries(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleOpen = async (id: string) => {
    const proj = await loadProjectFromDB(id);
    if (proj) {
      onSelectProject(proj);
      onClose();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const sheet = SCREEN_SHEET_PRESETS.find((p) => p.id === newSheetId) || SCREEN_SHEET_PRESETS[0];
    const proj = createBlankProject(
      newName,
      sheet.width,
      sheet.height,
      newFps,
      newBg,
      sheet.id
    );
    await saveProjectToDB(proj);
    onSelectProject(proj);
    onNotify(`Created "${proj.name}" (${sheet.name})`);
    onClose();
  };

  const handleDuplicate = async (id: string) => {
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
    await refreshList();
    onNotify(`Duplicated "${orig.name}"`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (summaries.length <= 1) {
      onNotify('Keep at least one project in the studio.');
      return;
    }
    await deleteProjectFromDB(id);
    await refreshList();
    onNotify(`Deleted "${name}"`);
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
      onSelectProject(imported);
      onNotify(`Imported "${imported.name}"`);
      onClose();
    } catch (err) {
      onNotify(`Import failed: ${err instanceof Error ? err.message : 'Invalid file'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[85vh] bg-[#181B23] border border-[#2D3444] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#262B36] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#F4F5F7]">Studio Projects</h2>
            <p className="text-xs text-[#9CA3AF]">
              All projects autosave locally to your browser storage.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20242E] hover:bg-[#2A303E] text-xs font-medium text-[#D1D5DB]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(!showNewForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A36] hover:bg-[#FF6E4E] text-xs font-semibold text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#252A36]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Project Form */}
        {showNewForm && (
          <form
            onSubmit={handleCreate}
            className="p-4 bg-[#14171E] border-b border-[#262B36] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] text-[#9CA3AF] mb-1">Project Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#111318] border border-[#2C3240] rounded-md px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#9CA3AF] mb-1">Screen Sheet</label>
              <select
                value={newSheetId}
                onChange={(e) => {
                  const id = e.target.value;
                  setNewSheetId(id);
                  const found = SCREEN_SHEET_PRESETS.find((p) => p.id === id);
                  if (found) setNewFps(found.fps);
                }}
                className="w-full bg-[#111318] border border-[#2C3240] rounded-md px-2.5 py-1.5 text-xs text-white"
              >
                {SCREEN_SHEET_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.width}×{p.height})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#9CA3AF] mb-1">Frame Rate (FPS)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={newFps}
                  onChange={(e) => setNewFps(Math.max(1, Math.min(30, Number(e.target.value) || 12)))}
                  className="w-full bg-[#111318] border border-[#2C3240] rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-white"
                />
                <input
                  type="color"
                  value={newBg}
                  onChange={(e) => setNewBg(e.target.value)}
                  title="Paper Background Color"
                  className="w-9 h-8 rounded bg-transparent border border-[#2C3240] cursor-pointer shrink-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 rounded-md bg-[#FF5A36] hover:bg-[#FF6E4E] text-xs font-semibold text-white flex items-center justify-center gap-1"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="py-1.5 px-2.5 rounded-md bg-[#20242E] text-xs text-[#9CA3AF]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Saved Projects Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-lg bg-[#20242E] animate-pulse" />
              ))}
            </div>
          ) : summaries.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#9CA3AF]">
              No saved projects yet. Click New Project to start animating.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {summaries.map((proj) => {
                const isCurrent = proj.id === activeProjectId;
                return (
                  <div
                    key={proj.id}
                    className={`group rounded-xl border overflow-hidden flex flex-col transition-colors ${
                      isCurrent
                        ? 'bg-[#212633] border-[#FF5A36]'
                        : 'bg-[#1D212A] border-[#2A303E] hover:border-[#3E475C]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpen(proj.id)}
                      className="h-28 w-full bg-[#111318] border-b border-[#262B36] overflow-hidden flex items-center justify-center"
                    >
                      {proj.thumbnailUrl ? (
                        <img
                          src={proj.thumbnailUrl}
                          alt={proj.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-[#6B7280]">Blank Canvas</span>
                      )}
                    </button>

                    <div className="p-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpen(proj.id)}
                        className="min-w-0 text-left flex-1"
                      >
                        <div className="text-xs font-semibold text-[#F4F5F7] truncate">
                          {proj.name}
                        </div>
                        <div className="text-[11px] font-mono text-[#8B93A5] tabular-nums">
                          {proj.frameCount}f · {proj.fps}fps · {proj.width}×{proj.height}
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(proj.id)}
                          title="Duplicate"
                          className="p-1.5 rounded hover:bg-[#2A303E] text-[#9CA3AF] hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isCurrent && summaries.length <= 1}
                          onClick={() => handleDelete(proj.id, proj.name)}
                          title="Delete"
                          className="p-1.5 rounded hover:bg-[#F43F5E]/20 text-[#9CA3AF] hover:text-[#F43F5E] disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
