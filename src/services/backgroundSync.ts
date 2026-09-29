// Client-side Background Sync & Offline Transaction Queue Service

export interface PendingTransaction {
  id: string;
  token: string | null;
  payload: {
    platformAccountId: string;
    type: string;
    amount: number;
    tag?: string;
    note?: string;
    date?: string;
    incentiveStatus?: string;
  };
  createdAt: number;
}

const DB_NAME = 'rw_sync_db';
const STORE_NAME = 'pending_transactions';

class BackgroundSyncService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Set<(count: number) => void> = new Set();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // Register Service Worker and subscribe to messages
  public async init(onSyncFinished?: () => void) {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[BackgroundSync] Service Worker registered with scope:', registration.scope);

        // Listen for sync completion messages from the Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'RW_SYNC_COMPLETED') {
            console.log('[BackgroundSync] Sync completed in background:', event.data.syncedCount);
            this.notifyListeners();
            if (onSyncFinished) {
              onSyncFinished();
            }
          }
        });
      } catch (err) {
        console.warn('[BackgroundSync] SW registration failed:', err);
      }
    }

    // Also trigger sync on window 'online' event
    window.addEventListener('online', () => {
      console.log('[BackgroundSync] Window is back online, syncing pending transactions...');
      this.triggerSync();
    });

    // Initial check
    this.notifyListeners();
  }

  // Queue an offline transaction in IndexedDB
  public async queueTransaction(
    payload: PendingTransaction['payload'],
    token: string | null
  ): Promise<PendingTransaction> {
    const db = await this.getDB();
    const item: PendingTransaction = {
      id: 'tx_offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      token,
      payload,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);

      req.onsuccess = () => {
        console.log('[BackgroundSync] Transaction queued in IndexedDB:', item.id);
        this.notifyListeners();

        // Request Background Sync from Service Worker if supported
        this.requestBackgroundSync();
        resolve(item);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Get all pending transactions
  public async getPendingList(): Promise<PendingTransaction[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  // Get count of pending transactions
  public async getPendingCount(): Promise<number> {
    try {
      const list = await this.getPendingList();
      return list.length;
    } catch {
      return 0;
    }
  }

  // Request browser Background Sync via registration.sync
  public async requestBackgroundSync() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if ('sync' in reg) {
          // Native BackgroundSync API (supported on Chrome/Edge/Android)
          await (reg as any).sync.register('sync-transactions');
          console.log('[BackgroundSync] Registered "sync-transactions" with native BackgroundSync API.');
          return;
        }
      } catch (e) {
        console.warn('[BackgroundSync] Native sync.register not available, will use fallback:', e);
      }
    }

    // Fallback: send message to active SW or sync directly if online
    if (navigator.onLine) {
      this.triggerSync();
    }
  }

  // Trigger sync via message to Service Worker or direct fallback
  public async triggerSync(): Promise<number> {
    if (!navigator.onLine) return 0;

    // Check if SW can handle it
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
    }

    // Also run client-side sync loop directly to ensure prompt execution across all browsers (including Safari)
    const pending = await this.getPendingList();
    if (pending.length === 0) return 0;

    let syncedCount = 0;
    const db = await this.getDB();

    for (const item of pending) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (item.token) {
          headers['Authorization'] = `Bearer ${item.token}`;
        }

        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers,
          body: JSON.stringify(item.payload),
        });

        if (res.ok || res.status === 201) {
          await new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(item.id);
            tx.oncomplete = resolve;
          });
          syncedCount++;
        } else if (res.status === 400 || res.status === 422) {
          // Permanent invalid request, clean it up
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(item.id);
        }
      } catch (err) {
        console.warn('[BackgroundSync] Direct sync paused, offline or connection reset:', err);
        break;
      }
    }

    if (syncedCount > 0) {
      this.notifyListeners();
    }

    return syncedCount;
  }

  // Subscribe to pending count changes
  public subscribe(callback: (count: number) => void): () => void {
    this.listeners.add(callback);
    this.getPendingCount().then(callback);
    return () => this.listeners.delete(callback);
  }

  private async notifyListeners() {
    const count = await this.getPendingCount();
    this.listeners.forEach((cb) => cb(count));
  }
}

export const syncService = new BackgroundSyncService();
