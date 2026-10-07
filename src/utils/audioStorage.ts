/**
 * IndexedDB storage for local user-uploaded MP3 and audio files.
 * Allows user MP3 files to persist permanently across page reloads and browser sessions.
 */

const DB_NAME = 'HappyMartAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

export interface StoredAudioRecord {
  id: string; // songId
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: number;
}

/**
 * Save an audio file (Blob/File) to IndexedDB
 */
export async function saveAudioFile(
  id: string,
  blob: Blob,
  fileName: string = 'track.mp3'
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredAudioRecord = {
        id,
        blob,
        fileName,
        mimeType: blob.type || 'audio/mpeg',
        size: blob.size,
        updatedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveAudioFile error:', err);
  }
}

/**
 * Get an audio Blob from IndexedDB
 */
export async function getAudioFile(id: string): Promise<StoredAudioRecord | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getAudioFile error:', err);
    return null;
  }
}

/**
 * Delete an audio file from IndexedDB
 */
export async function deleteAudioFile(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('deleteAudioFile error:', err);
  }
}

/**
 * Transform common user audio links (Google Drive, Dropbox, etc.) into direct playable streams
 */
export function normalizeAudioUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // Google Drive preview link:
  // e.g. https://drive.google.com/file/d/1a2b3c4d5e/view?usp=sharing
  // or https://drive.google.com/open?id=1a2b3c4d5e
  const gDriveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    const fileId = gDriveMatch[1];
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }

  // Dropbox link:
  // e.g. https://www.dropbox.com/s/xyz/song.mp3?dl=0
  if (url.includes('dropbox.com')) {
    if (url.includes('dl=0')) {
      return url.replace('dl=0', 'dl=1');
    }
    if (!url.includes('dl=1')) {
      return url + (url.includes('?') ? '&dl=1' : '?dl=1');
    }
  }

  return url;
}
