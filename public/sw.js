// Service Worker Background Sync & Offline Support for RiderWallet
const CACHE_NAME = 'riderwallet-static-v1';
const QUEUE_DB_NAME = 'rw_sync_db';
const QUEUE_STORE_NAME = 'pending_transactions';

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all pending transactions from IndexedDB
async function getPendingTransactions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE_NAME, 'readonly');
    const store = tx.objectStore(QUEUE_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Delete a synced transaction from IndexedDB
async function removePendingTransaction(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Sync all pending transactions to MongoDB backend
async function syncPendingTransactions() {
  const pending = await getPendingTransactions();
  if (!pending || pending.length === 0) {
    return { syncedCount: 0 };
  }

  console.log(`[SW Background Sync] Found ${pending.length} pending transaction(s) to sync.`);
  let syncedCount = 0;

  for (const item of pending) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (item.token) {
        headers['Authorization'] = `Bearer ${item.token}`;
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify(item.payload),
      });

      if (response.ok || response.status === 201) {
        await removePendingTransaction(item.id);
        syncedCount++;
        console.log(`[SW Background Sync] Successfully synced transaction ${item.id}`);
      } else if (response.status === 400 || response.status === 422) {
        // If permanent bad request, remove so it doesn't block queue
        await removePendingTransaction(item.id);
        console.warn(`[SW Background Sync] Dropped invalid transaction ${item.id}`);
      }
    } catch (err) {
      console.warn(`[SW Background Sync] Network sync failed for ${item.id}, will retry on next reconnect`, err);
      break;
    }
  }

  // Notify clients that sync finished so UI can refresh balances and badges
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage({
      type: 'RW_SYNC_COMPLETED',
      syncedCount,
    });
  }

  return { syncedCount };
}

// Service Worker Install & Activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Sync event (triggered by browser BackgroundSync API when connection is online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions' || event.tag === 'riderwallet-tx-sync') {
    event.waitUntil(syncPendingTransactions());
  }
});

// Message listener from web app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncPendingTransactions());
  }
});
