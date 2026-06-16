const DB_NAME = 'AIgenRenderDB';
const DB_VERSION = 1;
const STORE_GALLERY = 'gallery';
const STORE_USER = 'user';

export interface GalleryImage {
  id: string;
  url: string;
  prompt: string;
  negativePrompt: string;
  cfg: number;
  steps: number;
  width: number;
  height: number;
  modelName: string;
  loraName?: string;
  loraStrength?: number;
  timestamp: number;
  stage: 'generate' | 'edit' | 'compare' | 'canvas';
  isTransparent?: boolean;
  assetType?: 'sprite' | 'texture' | 'icon' | 'background' | 'ui';
  tags?: string[];
  spriteGroupId?: string;
}

export interface UserQuota {
  id: 'quota';
  date: string;
  generationsToday: number;
}

let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_GALLERY)) {
        db.createObjectStore(STORE_GALLERY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_USER)) {
        db.createObjectStore(STORE_USER, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      console.error("IndexedDB Error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveImageToDB = async (imageObj: GalleryImage): Promise<GalleryImage> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_GALLERY, 'readwrite');
    const store = transaction.objectStore(STORE_GALLERY);
    if (!imageObj.id) imageObj.id = Date.now().toString();

    const request = store.put(imageObj);
    request.onsuccess = () => resolve(imageObj);
    request.onerror = () => reject(request.error);
  });
};

export const getAllImagesFromDB = async (): Promise<GalleryImage[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_GALLERY, 'readonly');
    const store = transaction.objectStore(STORE_GALLERY);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result.sort((a, b) => Number(b.id) - Number(a.id));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteImageFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_GALLERY, 'readwrite');
    const store = transaction.objectStore(STORE_GALLERY);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getUserState = async (): Promise<UserQuota> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_USER, 'readonly');
    const store = transaction.objectStore(STORE_USER);
    const request = store.get('quota');
    request.onsuccess = () => {
      const today = new Date().toDateString();
      if (request.result) {
        // Reset daily quota if it's a new day
        if (request.result.date !== today) {
          resolve({ id: 'quota', date: today, generationsToday: 0 });
        } else {
          resolve(request.result);
        }
      } else {
        resolve({ id: 'quota', date: today, generationsToday: 0 });
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveUserState = async (state: UserQuota): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_USER, 'readwrite');
    const store = transaction.objectStore(STORE_USER);
    state.id = 'quota';
    const request = store.put(state);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
