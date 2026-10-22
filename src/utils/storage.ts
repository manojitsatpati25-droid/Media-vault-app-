import { MediaItem } from '../types';

const DB_NAME = 'MediaVaultLocalDB';
const STORE_NAME = 'user_uploads';
const DB_VERSION = 1;

export function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalMedia(item: MediaItem): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving to IndexedDB:', err);
    // Fallback to localStorage for small items if IndexedDB fails
    try {
      const saved = localStorage.getItem('mv_fallback_uploads');
      const list: MediaItem[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter((m) => m.id !== item.id);
      filtered.unshift(item);
      localStorage.setItem('mv_fallback_uploads', JSON.stringify(filtered.slice(0, 50)));
    } catch (e) {
      // ignore
    }
  }
}

export async function updateLocalMediaItem(id: string, updates: Partial<MediaItem>): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    
    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = { ...getReq.result, ...updates };
        store.put(updated);
      }
    };
  } catch (err) {
    console.warn('Could not update in IndexedDB:', err);
  }
}

export async function getLocalMedia(): Promise<MediaItem[]> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const items: MediaItem[] = request.result || [];
        // Also check if any fallback localStorage items exist
        try {
          const fallbackStr = localStorage.getItem('mv_fallback_uploads');
          if (fallbackStr) {
            const fallbackList: MediaItem[] = JSON.parse(fallbackStr);
            fallbackList.forEach((fb) => {
              if (!items.some((i) => i.id === fb.id)) {
                items.unshift(fb);
              }
            });
          }
        } catch {
          // ignore
        }
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error fetching from IndexedDB:', err);
    try {
      const fallbackStr = localStorage.getItem('mv_fallback_uploads');
      return fallbackStr ? JSON.parse(fallbackStr) : [];
    } catch {
      return [];
    }
  }
}

// Convert a File to base64 Data URL so it persists offline and in APK
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Generate thumbnail from first frame of video file
export function generateVideoThumbnail(videoFile: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const blobUrl = URL.createObjectURL(videoFile);
    video.src = blobUrl;

    const cleanup = () => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore
      }
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = Math.min(640, video.videoWidth || 640);
        const height = Math.round((width / (video.videoWidth || 640)) * (video.videoHeight || 360));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const thumb = canvas.toDataURL('image/jpeg', 0.8);
          cleanup();
          resolve(thumb);
          return;
        }
      } catch (e) {
        // fallback
      }
      cleanup();
      resolve('');
    };

    video.onerror = () => {
      cleanup();
      resolve('');
    };

    // Timeout safety
    setTimeout(() => {
      cleanup();
      resolve('');
    }, 4000);
  });
}

export function formatTimeAgo(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${Math.floor(diffMonths / 12)}y ago`;
  } catch (e) {
    return 'Recently';
  }
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
