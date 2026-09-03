// Adapter "cloud": stessa superficie dell'adapter demo, ma i dati stanno su
// DynamoDB e le immagini su S3, dietro l'API Gateway del marketplace.
//
// Le rotte corrispondono alle Lambda in ../../../lambda:
//   /catalog       tabella <prefix>-catalog-products
//   /media         tabella <prefix>-product-images + bucket <prefix>-media
//   /listings      tabella <prefix>-listings
//   /permissions   tabella <prefix>-content-permissions
//   /reports       tabella <prefix>-content-reports

import { prepareImage } from '../media.js'

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

// Le rotte /orders del marketplace vogliono un Authorization: il gestionale non
// ha ancora un login proprio (vedi README), quindi riusa il token demo del sito
// pubblico se il browser ne ha uno.
function authHeader() {
  try {
    const token = localStorage.getItem('allena.token')
    return token ? { authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${BASE}${path}`)
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeader(),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const payload = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err = new Error(payload?.message || `Errore ${res.status}`)
    err.code = res.status
    Object.assign(err, payload || {})
    throw err
  }
  return payload
}

/** Carica una derivata su S3 con la URL prefirmata restituita dalla Lambda. */
async function putToS3(url, blob) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'image/webp' },
    body: blob,
  })
  if (!res.ok) throw new Error('Caricamento su S3 non riuscito')
}

export const httpAdapter = {
  mode: 'cloud',

  listStores: () => request('/stores'),
  getStore: (id) => request(`/stores/${id}`),
  createStore: (input) => request('/stores', { method: 'POST', body: input }),
  updateStore: (id, patch) => request(`/stores/${id}`, { method: 'PUT', body: patch }),

  searchProducts: (params) => request('/catalog', { query: params }),
  getProduct: (id) => request(`/catalog/${id}`),
  findDuplicate: ({ brand, name }) => request('/catalog/duplicate', { query: { brand, name } }),
  createProduct: (input) => request('/catalog', { method: 'POST', body: input }),
  updateProduct: (id, patch, storeId) =>
    request(`/catalog/${id}`, { method: 'PUT', body: { ...patch, storeId } }),

  listProductImages: (productId, viewerStoreId) =>
    request('/media', { query: { productId, viewerStoreId } }),

  async uploadImage({ productId, storeId, file, caption = '', generic = false }) {
    const prepared = await prepareImage(file)
    // 1) la Lambda riserva l'id e firma le due destinazioni su S3
    const slot = await request('/media/upload-url', {
      method: 'POST',
      body: { productId, storeId, contentType: 'image/webp' },
    })
    // 2) il browser carica direttamente su S3, senza passare dall'API
    await Promise.all([
      putToS3(slot.fullUrl, prepared.fullBlob),
      putToS3(slot.coverUrl, prepared.coverBlob),
    ])
    // 3) si registra il metadato su DynamoDB
    return request('/media', {
      method: 'POST',
      body: {
        imageId: slot.imageId,
        productId,
        storeId,
        caption,
        generic,
        fullKey: slot.fullKey,
        coverKey: slot.coverKey,
        width: prepared.width,
        height: prepared.height,
        bytes: prepared.bytes,
      },
    })
  },

  updateImage: (id, patch, storeId) =>
    request(`/media/${id}`, { method: 'PUT', body: { ...patch, storeId } }),
  deleteImage: (id, storeId) => request(`/media/${id}`, { method: 'DELETE', query: { storeId } }),

  listListingsByStore: (storeId) => request('/listings', { query: { storeId } }),
  listListingsByProduct: (productId) => request('/listings', { query: { productId } }),
  getListing: (storeId, productId) => request(`/listings/${storeId}/${productId}`),
  createListing: (storeId, productId) =>
    request('/listings', { method: 'POST', body: { storeId, productId } }),
  saveListing: (listing) =>
    request(`/listings/${listing.storeId}/${listing.productId}`, { method: 'PUT', body: listing }),
  deleteListing: (storeId, productId) =>
    request(`/listings/${storeId}/${productId}`, { method: 'DELETE' }),

  listPermissions: (storeId) => request('/permissions', { query: { storeId } }),
  requestPermission: (input) => request('/permissions', { method: 'POST', body: input }),
  updatePermission: (id, patch, storeId) =>
    request(`/permissions/${id}`, { method: 'PUT', body: { ...patch, storeId } }),

  // Ordini ricevuti: una consegna per ogni ordine pagato che tocca il negozio.
  // Le scrive la Lambda `orders` del marketplace alla cattura del pagamento.
  listFulfilments: (storeId) => request(`/orders/store/${encodeURIComponent(storeId)}`),

  // Il negozio a cui si agisce lo capisce la Lambda dal token (vedi
  // authHeader sopra): `storeId` qui non serve, resta solo per tenere la
  // stessa firma dell'adapter demo.
  acceptFulfilment: (id, _storeId) =>
    request(`/orders/fulfilments/${id}/accept`, { method: 'POST' }),
  rejectFulfilment: (id, _storeId, reason) =>
    request(`/orders/fulfilments/${id}/reject`, { method: 'POST', body: { reason } }),
  rescheduleFulfilment: (id, _storeId, date, note) =>
    request(`/orders/fulfilments/${id}/reschedule`, { method: 'POST', body: { date, note } }),
  deliverFulfilment: (id, _storeId) =>
    request(`/orders/fulfilments/${id}/deliver`, { method: 'POST' }),

  // Chat: una conversazione per consegna, lato negozio.
  listThreads: (_storeId) => request('/chat/threads'),
  getThreadMessages: (threadId, _storeId) => request(`/chat/threads/${threadId}/messages`),
  sendThreadMessage: (threadId, _storeId, text) =>
    request(`/chat/threads/${threadId}/messages`, { method: 'POST', body: { text } }),

  listReports: (storeId) => request('/reports', { query: { storeId } }),
  createReport: (input) => request('/reports', { method: 'POST', body: input }),
  updateReport: (id, patch, storeId) =>
    request(`/reports/${id}`, { method: 'PUT', body: { ...patch, storeId } }),

  async resetDemoData() {
    throw new Error('Il reset è disponibile solo in modalità demo')
  },
}
