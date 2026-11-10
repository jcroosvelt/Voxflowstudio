import { SavedAudioRecord } from '../types';

const DB_NAME = 'VoxflowStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioHistory';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB n\'est pas supporté par ce navigateur.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('voiceName', 'voiceName', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Saves an audio record into IndexedDB
 */
export async function saveAudioRecordToDB(record: SavedAudioRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Exclude volatile object URLs before saving to IndexedDB
    const { mp3Url, wavUrl, ...persistedRecord } = record;
    const request = store.put(persistedRecord);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieves all saved audio records sorted by newest first
 */
export async function getAllAudioRecordsFromDB(): Promise<SavedAudioRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      const records: SavedAudioRecord[] = request.result || [];
      // Re-hydrate URLs for client playback
      const hydrated = records.map((rec) => ({
        ...rec,
        mp3Url: rec.mp3Blob ? URL.createObjectURL(rec.mp3Blob) : undefined,
        wavUrl: rec.wavBlob ? URL.createObjectURL(rec.wavBlob) : undefined,
      }));
      // Sort newest first
      hydrated.sort((a, b) => b.timestamp - a.timestamp);
      resolve(hydrated);
    };

    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Deletes an audio record from IndexedDB by id
 */
export async function deleteAudioRecordFromDB(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Updates the title of an audio record
 */
export async function updateAudioRecordTitleInDB(id: string, newTitle: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        reject(new Error('Enregistrement introuvable'));
        return;
      }
      record.title = newTitle;
      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Clears all audio history from IndexedDB
 */
export async function clearAllAudioRecordsFromDB(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}
