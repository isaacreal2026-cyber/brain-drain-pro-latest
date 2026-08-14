const DB_NAME = "brainBuilder";
const DB_VERSION = 6;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens (or reuses the cached) IndexedDB connection. Reusing a single
 * connection avoids the overhead of opening a new one for every read/write
 * and prevents transaction churn during bulk operations.
 */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;

      // Recover from the browser invalidating the connection (e.g. storage
      // eviction, private mode, devtools deletion).
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        // Another tab/context requested a version upgrade; close gracefully
        // so the upgrade can proceed.
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("brains")) {
          db.createObjectStore("brains", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("nodes")) {
          const nodeStore = db.createObjectStore("nodes", { keyPath: "id" });
          nodeStore.createIndex("brain_id", "brain_id", { unique: false });
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("posts")) {
          const postStore = db.createObjectStore("posts", { keyPath: "id" });
          postStore.createIndex("topicId", "topicId", { unique: false });
          postStore.createIndex("userId", "userId", { unique: false });
        }
        if (!db.objectStoreNames.contains("topics")) {
          db.createObjectStore("topics", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("profile")) {
          db.createObjectStore("profile", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("brain_dna")) {
          const dnaStore = db.createObjectStore("brain_dna", { keyPath: "id" });
          dnaStore.createIndex("brainId", "brainId", { unique: true });
        }
      }

      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains("messages")) {
          const messageStore = db.createObjectStore("messages", { keyPath: "id" });
          messageStore.createIndex("conversationId", "conversationId", { unique: false });
        }
        if (!db.objectStoreNames.contains("conversations")) {
          db.createObjectStore("conversations", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("notifications")) {
          db.createObjectStore("notifications", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("comments")) {
          const commentStore = db.createObjectStore("comments", { keyPath: "id" });
          commentStore.createIndex("postId", "postId", { unique: false });
          commentStore.createIndex("parentId", "parentId", { unique: false });
        }
        if (!db.objectStoreNames.contains("communities")) {
          db.createObjectStore("communities", { keyPath: "id" });
        }
      }

      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains("missions")) {
          const missionStore = db.createObjectStore("missions", { keyPath: "id" });
          missionStore.createIndex("status", "status", { unique: false });
          missionStore.createIndex("category", "category", { unique: false });
        }
        if (!db.objectStoreNames.contains("milestones")) {
          const milestoneStore = db.createObjectStore("milestones", { keyPath: "id" });
          milestoneStore.createIndex("missionId", "missionId", { unique: false });
        }
        if (!db.objectStoreNames.contains("reputation")) {
          db.createObjectStore("reputation", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("xp_events")) {
          db.createObjectStore("xp_events", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("checkins")) {
          const checkinStore = db.createObjectStore("checkins", { keyPath: "id" });
          checkinStore.createIndex("circleId", "circleId", { unique: false });
          checkinStore.createIndex("userId", "userId", { unique: false });
        }
        if (!db.objectStoreNames.contains("pathways")) {
          db.createObjectStore("pathways", { keyPath: "id" });
        }
      }

      if (oldVersion < 5) {
        if (!db.objectStoreNames.contains("books")) {
          db.createObjectStore("books", { keyPath: "id" });
        }
      }

      if (oldVersion < 6) {
        if (!db.objectStoreNames.contains("analytics_events")) {
          const analyticsStore = db.createObjectStore("analytics_events", { keyPath: "id" });
          analyticsStore.createIndex("type", "type", { unique: false });
          analyticsStore.createIndex("sessionId", "sessionId", { unique: false });
          analyticsStore.createIndex("createdAt", "createdAt", { unique: false });
          analyticsStore.createIndex("route", "route", { unique: false });
        }
      }
    };
  });

  return dbPromise;
}

/**
 * Resets the cached connection so the next call to openDB() reopens it.
 * Used after a versionchange/blocked event or when storage is cleared.
 */
export function resetDBConnection() {
  if (dbPromise) {
    dbPromise.then((db) => db.close()).catch(() => {});
  }
  dbPromise = null;
}

export const idb = {
  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllByIndex<T>(storeName: string, indexName: string, key: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async put<T = unknown>(storeName: string, value: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Persists many values to a single store inside ONE transaction. This is
   * dramatically faster than awaiting idb.put() in a loop (which opens a new
   * transaction per item).
   */
  async putAll<T = unknown>(storeName: string, values: T[]): Promise<void> {
    if (values.length === 0) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      for (const value of values) {
        store.put(value);
      }
    });
  },

  async delete(storeName: string, key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Deletes many keys from one store in a single transaction.
   */
  async deleteAll(storeName: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      for (const key of keys) {
        store.delete(key);
      }
    });
  },

  async clear(storeName: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Clears every object store. This is destructive and is only used by the
   * admin-gated "Refresh data" action in Settings.
   */
  async clearAll(storeNames?: string[]): Promise<void> {
    const db = await openDB();
    const names = storeNames && storeNames.length > 0 ? storeNames : Array.from(db.objectStoreNames);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      for (const name of names) {
        tx.objectStore(name).clear();
      }
    });
  },

  storeNames(): Promise<string[]> {
    return openDB().then((db) => Array.from(db.objectStoreNames));
  },
};
