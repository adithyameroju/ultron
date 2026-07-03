/** IndexedDB persistence for previously generated poster sessions (library tab). */

import type { CreativeTheme, LinkedInFormatId, PosterContent } from './posterTypes';

const DB_NAME = 'enterprise-socials-studio-library';
const STORE = 'sessions';
const DB_VERSION = 1;
const MAX_ENTRIES = 48;

export type StudioLibraryEntry = {
  id: string;
  createdAt: number;
  headlinePreview: string;
  format: LinkedInFormatId;
  theme: CreativeTheme;
  includeVisual: boolean;
  content: PosterContent;
  carouselSlides?: PosterContent[];
  /** PNG thumbnail for the library grid */
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('byCreated', 'createdAt', { unique: false });
      }
    };
  });
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function trimLibrary(keep: number): Promise<void> {
  const db = await openDb();
  const all = await new Promise<StudioLibraryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const q = tx.objectStore(STORE).getAll();
    q.onsuccess = () => resolve((q.result as StudioLibraryEntry[]) ?? []);
    q.onerror = () => reject(q.error);
  });
  db.close();
  if (all.length <= keep) {
    return;
  }
  all.sort((a, b) => b.createdAt - a.createdAt);
  const drop = all.slice(keep);
  const db2 = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db2.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const s = tx.objectStore(STORE);
    for (const row of drop) {
      s.delete(row.id);
    }
  });
  db2.close();
}

export async function saveStudioLibraryEntry(args: {
  content: PosterContent;
  format: LinkedInFormatId;
  theme: CreativeTheme;
  includeVisual: boolean;
  carouselSlides?: PosterContent[];
  thumbBlob: Blob;
}): Promise<StudioLibraryEntry> {
  const headlinePreview =
    args.carouselSlides?.[0]?.headline?.trim() ||
    args.content.headline.trim() ||
    args.content.overline.trim() ||
    'Untitled';
  const entry: StudioLibraryEntry = {
    id: randomId(),
    createdAt: Date.now(),
    headlinePreview: headlinePreview.slice(0, 120),
    format: args.format,
    theme: args.theme,
    includeVisual: args.includeVisual,
    content: args.content,
    carouselSlides: args.carouselSlides,
    blob: args.thumbBlob,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(entry);
  });
  db.close();
  await trimLibrary(MAX_ENTRIES);
  return entry;
}

export async function listStudioLibrary(limit = 48): Promise<StudioLibraryEntry[]> {
  const db = await openDb();
  const all = await new Promise<StudioLibraryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const q = tx.objectStore(STORE).getAll();
    q.onsuccess = () => resolve((q.result as StudioLibraryEntry[]) ?? []);
    q.onerror = () => reject(q.error);
  });
  db.close();
  all.sort((a, b) => b.createdAt - a.createdAt);
  return all.slice(0, limit);
}

export async function deleteStudioLibraryEntry(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
  db.close();
}

export async function clearStudioLibrary(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).clear();
  });
  db.close();
}
