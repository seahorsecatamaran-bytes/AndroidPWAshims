/**
 * DualMode PWA Toolkit - Storage Vault
 * IndexedDB management with schema migrations, JSON document store,
 * binary audio blob storage, and persistent storage quota monitoring.
 */
export class StorageVault {
  constructor(options = {}) {
    this.dbName = options.dbName || 'dualmode_pwa_vault';
    this.version = options.version || 2;
    this.db = null;
    this.migrationHooks = options.migrations || this._defaultMigrations();
  }

  _defaultMigrations() {
    return {
      // Version 1: Core key-value config and JSON track records
      1: (db, tx) => {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('by_category', 'category', { unique: false });
          docStore.createIndex('by_updatedAt', 'updatedAt', { unique: false });
        }
      },
      // Version 2: Binary audio clip blobs and telemetry records
      2: (db, tx) => {
        if (!db.objectStoreNames.contains('audioBlobs')) {
          const audioStore = db.createObjectStore('audioBlobs', { keyPath: 'id' });
          audioStore.createIndex('by_created', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('telemetry')) {
          const telemetryStore = db.createObjectStore('telemetry', { autoIncrement: true });
          telemetryStore.createIndex('by_timestamp', 'timestamp', { unique: false });
        }
      }
    };
  }

  /**
   * Open the IndexedDB database, running any needed migrations sequentially
   */
  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is unavailable in this environment'));
      }

      const req = window.indexedDB.open(this.dbName, this.version);

      req.onupgradeneeded = (event) => {
        const db = req.result;
        const tx = req.transaction;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;

        console.log(`[StorageVault] Migrating database "${this.dbName}" from v${oldVersion} to v${newVersion}`);

        // Apply migrations sequentially from oldVersion + 1 to newVersion
        for (let v = oldVersion + 1; v <= newVersion; v++) {
          if (this.migrationHooks[v]) {
            console.log(`[StorageVault] Running migration hook for v${v}`);
            this.migrationHooks[v](db, tx);
          }
        }
      };

      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };

      req.onerror = () => reject(req.error);
    });
  }

  // --- JSON DOCUMENT STORE ---

  async saveDocument(storeName, doc) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      if (!doc.updatedAt) doc.updatedAt = new Date().toISOString();
      const req = store.put(doc);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getDocument(storeName, id) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllDocuments(storeName) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteDocument(storeName, id) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // --- BINARY AUDIO BLOB STORE ---

  async saveAudioBlob(id, blob, metadata = {}) {
    await this.open();
    const record = {
      id,
      blob,
      size: blob.size,
      mimeType: blob.type,
      createdAt: new Date().toISOString(),
      ...metadata
    };
    return this.saveDocument('audioBlobs', record);
  }

  async getAudioBlob(id) {
    const record = await this.getDocument('audioBlobs', id);
    return record ? record.blob : null;
  }

  // --- STORAGE QUOTA & PERSISTENCE ---

  async requestPersistence() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        return await navigator.storage.persist();
      } catch {
        return false;
      }
    }
    return false;
  }

  async getStorageStats() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
        return {
          usageBytes: estimate.usage || 0,
          quotaBytes: estimate.quota || 0,
          usageMB: ((estimate.usage || 0) / (1024 * 1024)).toFixed(2),
          quotaMB: ((estimate.quota || 0) / (1024 * 1024)).toFixed(2),
          percentUsed: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : '0',
          persisted
        };
      } catch {
        // Fall back to default estimate
      }
    }
    return {
      usageBytes: 0,
      quotaBytes: 0,
      usageMB: '0.00',
      quotaMB: '0.00',
      percentUsed: '0',
      persisted: false,
      simulated: true
    };
  }
}
