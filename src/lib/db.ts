import { supabase } from './supabase';

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
    if (dbInstance) return resolve(dbInstance);
    
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
    request.onerror = (event: Event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

// --- BASE64 UTILS ---
function base64ToBlob(base64: string, mimeType = 'image/png') {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

// --- MIGRATION SCRIPT ---
export const migrateIndexedDBToSupabase = async (userId: string) => {
  const localImages = await getAllImagesFromDB(null); // Force read local
  if (localImages.length === 0) return;

  console.log(`Starting migration of ${localImages.length} images to Supabase...`);

  for (const img of localImages) {
    try {
      // 1. If it's a local blob/base64, upload it to Supabase Storage
      let publicUrl = img.url;
      if (img.url.startsWith('data:image')) {
        const blob = base64ToBlob(img.url);
        const fileName = `${userId}/${img.id}.png`;
        const { data, error } = await supabase.storage
          .from('assets')
          .upload(fileName, blob, { upsert: true });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }

      // 2. Insert into Postgres
      await supabase.from('generations').insert({
        id: img.id.length > 30 ? img.id : undefined, // uuid check
        user_id: userId,
        asset_type: img.assetType || 'sprite',
        media_url: publicUrl,
        prompt: img.prompt,
        negative_prompt: img.negativePrompt,
        metadata: {
          cfg: img.cfg,
          steps: img.steps,
          width: img.width,
          height: img.height,
          modelName: img.modelName,
          stage: img.stage,
        },
        created_at: new Date(img.timestamp).toISOString()
      });

      // 3. Delete from IndexedDB to prevent duplicate migration
      await deleteImageFromDB(img.id, null);
    } catch (err) {
      console.error('Failed to migrate image', img.id, err);
    }
  }
  console.log('Migration complete!');
};

// --- DATA ACCESS METHODS ---
export const saveImageToDB = async (imageObj: GalleryImage, userId: string | null = null): Promise<GalleryImage> => {
  if (!imageObj.id) imageObj.id = Date.now().toString();

  if (userId) {
    // Save to Cloud (Assuming url is already a public URL or handled via webhook)
    await supabase.from('generations').insert({
      user_id: userId,
      asset_type: imageObj.assetType || 'sprite',
      media_url: imageObj.url,
      prompt: imageObj.prompt,
      negative_prompt: imageObj.negativePrompt,
      metadata: {
        cfg: imageObj.cfg,
        steps: imageObj.steps,
        width: imageObj.width,
        height: imageObj.height,
        modelName: imageObj.modelName,
        stage: imageObj.stage,
      },
      created_at: new Date(imageObj.timestamp).toISOString()
    });
    return imageObj;
  } else {
    // Save to Local
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_GALLERY, 'readwrite');
      const store = transaction.objectStore(STORE_GALLERY);
      const request = store.put(imageObj);
      request.onsuccess = () => resolve(imageObj);
      request.onerror = () => reject(request.error);
    });
  }
};

export const getAllImagesFromDB = async (userId: string | null = null): Promise<GalleryImage[]> => {
  if (userId) {
    // Fetch from Cloud
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Supabase fetch error:", error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      url: row.media_url,
      prompt: row.prompt,
      negativePrompt: row.negative_prompt || '',
      cfg: row.metadata?.cfg || 7,
      steps: row.metadata?.steps || 20,
      width: row.metadata?.width || 512,
      height: row.metadata?.height || 512,
      modelName: row.metadata?.modelName || 'Unknown',
      timestamp: new Date(row.created_at).getTime(),
      stage: row.metadata?.stage || 'generate',
      assetType: row.asset_type,
    }));
  } else {
    // Fetch from Local
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
  }
};

export const deleteImageFromDB = async (id: string, userId: string | null = null): Promise<void> => {
  if (userId) {
    await supabase.from('generations').delete().eq('id', id).eq('user_id', userId);
  } else {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_GALLERY, 'readwrite');
      const store = transaction.objectStore(STORE_GALLERY);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

// Quota logic remains local for unauthenticated users
export const getUserState = async (): Promise<UserQuota> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_USER, 'readonly');
    const store = transaction.objectStore(STORE_USER);
    const request = store.get('quota');
    request.onsuccess = () => {
      const today = new Date().toDateString();
      if (request.result) {
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
