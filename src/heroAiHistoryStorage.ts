/** IndexedDB persistence for AI hero PNGs (avoids localStorage size limits). */

const DB_NAME = 'enterprise-socials-hero-ai';
const STORE = 'generations';
const DB_VERSION = 1;
const MAX_ENTRIES = 36;

export type HeroAiHistoryEntry = {
  id: string;
  createdAt: number;
  headlinePreview: string;
  format: string;
  /** PNG bytes */
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

export async function saveHeroAiToHistory(args: {
  dataUrl: string;
  headlinePreview: string;
  format: string;
}): Promise<HeroAiHistoryEntry> {
  const res = await fetch(args.dataUrl);
  const blob = await res.blob();
  const id = randomId();
  const entry: HeroAiHistoryEntry = {
    id,
    createdAt: Date.now(),
    headlinePreview: args.headlinePreview.slice(0, 120),
    format: args.format,
    blob,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(entry);
  });
  db.close();
  await trimHeroAiHistory(MAX_ENTRIES);
  return entry;
}

async function trimHeroAiHistory(keep: number): Promise<void> {
  const db = await openDb();
  const all = await new Promise<HeroAiHistoryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const q = tx.objectStore(STORE).getAll();
    q.onsuccess = () => resolve((q.result as HeroAiHistoryEntry[]) ?? []);
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

export async function listHeroAiHistory(limit = 24): Promise<HeroAiHistoryEntry[]> {
  const db = await openDb();
  const all = await new Promise<HeroAiHistoryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const q = tx.objectStore(STORE).getAll();
    q.onsuccess = () => resolve((q.result as HeroAiHistoryEntry[]) ?? []);
    q.onerror = () => reject(q.error);
  });
  db.close();
  all.sort((a, b) => b.createdAt - a.createdAt);
  return all.slice(0, limit);
}

export async function clearHeroAiHistory(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).clear();
  });
  db.close();
}
