// Archivio chiave/valore su IndexedDB per i binari delle immagini in modalità
// demo: localStorage non regge i data URL, IndexedDB sì.

const DB_NAME = 'gestionale-media'
const STORE = 'blobs'
let dbPromise = null

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function tx(mode, run) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const req = run(transaction.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const mediaStore = {
  get: (key) => tx('readonly', (s) => s.get(key)),
  put: (key, value) => tx('readwrite', (s) => s.put(value, key)),
  remove: (key) => tx('readwrite', (s) => s.delete(key)),
  async getMany(keys) {
    const values = await Promise.all(keys.map((k) => mediaStore.get(k)))
    return Object.fromEntries(keys.map((k, i) => [k, values[i]]))
  },
}
