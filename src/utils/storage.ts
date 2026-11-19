import { AnimationProject, ProjectSummary } from '../types/animation';
import { generateThumbnailDataUrl } from './drawing';

const DB_NAME = 'CelDraftStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const ACTIVE_PROJECT_KEY = 'celdraft_active_project_id';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjectToDB(project: AnimationProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.put({ ...project, updatedAt: Date.now() });
    tx.oncomplete = () => {
      try {
        localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
      } catch {
        // Ignore quota errors on localStorage key
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadProjectFromDB(id: string): Promise<AnimationProject | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as AnimationProject) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listProjectsFromDB(): Promise<AnimationProject[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as AnimationProject[]) || [];
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  const projects = await listProjectsFromDB();
  const summaries: ProjectSummary[] = [];
  for (const proj of projects) {
    let thumbnailUrl = '';
    if (proj.frames.length > 0) {
      thumbnailUrl = await generateThumbnailDataUrl(
        proj.frames[0],
        proj.layers,
        proj.width,
        proj.height,
        proj.backgroundColor,
        180
      ).catch(() => '');
    }
    summaries.push({
      id: proj.id,
      name: proj.name,
      width: proj.width,
      height: proj.height,
      fps: proj.fps,
      frameCount: proj.frames.length,
      thumbnailUrl,
      updatedAt: proj.updatedAt,
    });
  }
  return summaries;
}

export function getLastActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
