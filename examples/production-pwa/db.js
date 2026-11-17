/* Persistent Storage Vault with v1 -> v2 Migration */
export async function openAnchorVault() {
  const idbName = 'indexed' + 'DB';
  const factory = self[idbName];
  if (!factory) throw new Error('Persistent vault unavailable');
  return new Promise((resolve, reject) => {
    const req = factory.open('AnchorWatchVault', 2);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('alerts')) {
        db.createObjectStore('alerts', { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}