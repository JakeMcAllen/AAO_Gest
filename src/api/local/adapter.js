// Adapter "demo": stessa superficie dell'adapter cloud, ma tutto in locale.
// Le regole di dominio (unicità del catalogo, permessi sui contenuti) sono
// applicate qui esattamente come nelle Lambda, così la demo non mente.

import {
  catalogKey,
  emptyListing,
  emptySellerDelivery,
  emptySellerServices,
  sellerAcceptsDate,
} from '../../domain.js'
import { prepareImage } from '../media.js'
import { clone, db, uid } from './db.js'
import { mediaStore } from './idb.js'

const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 120))

async function ok(value) {
  await latency()
  return clone(value)
}

function fail(message, code = 400, extra = {}) {
  const err = new Error(message)
  err.code = code
  Object.assign(err, extra)
  throw err
}

// ---------------------------------------------------------------------------
// Ordini ricevuti + chat locale: la stessa forma di dati che scriverebbe la
// Lambda `orders` del marketplace, cosi' passare a VITE_DATA_MODE=cloud non
// cambia una riga di interfaccia.
// ---------------------------------------------------------------------------

function findFulfilment(data, id, storeId) {
  const f = (data.fulfilments || []).find((x) => x.id === id)
  if (!f) fail('Consegna non trovata', 404)
  if (f.storeId !== storeId) fail('Non hai accesso a questa consegna', 403)
  return f
}

function ensureLocalThread(data, f) {
  data.chatThreads = data.chatThreads || []
  data.chatMessages = data.chatMessages || []
  let thread = data.chatThreads.find((t) => t.id === f.id)
  if (!thread) {
    const now = new Date().toISOString()
    thread = {
      id: f.id,
      orderId: f.orderId,
      reference: f.reference,
      fulfilmentId: f.id,
      storeId: f.storeId,
      storeName: f.storeName,
      customerId: f.customerId,
      customerName: f.customerName,
      lastMessage: '',
      lastMessageAt: now,
      customerUnread: 0,
      storeUnread: 0,
      createdAt: now,
      updatedAt: now,
    }
    data.chatThreads.push(thread)
  }
  return thread
}

/** Scrive un messaggio e aggiorna i contatori di non letto, come la Lambda. */
function postLocalMessage(data, f, { from, authorName, text, kind = 'message' }) {
  const thread = ensureLocalThread(data, f)
  const now = new Date().toISOString()
  const message = {
    threadId: thread.id,
    at: now + '#' + Math.random().toString(16).slice(2, 8),
    id: uid('msg'),
    from,
    authorName: authorName || '',
    text,
    kind,
    createdAt: now,
  }
  data.chatMessages.push(message)
  thread.lastMessage = text
  thread.lastMessageAt = now
  thread.updatedAt = now
  if (from === 'system') {
    // Nessuno dei due lati l'ha ancora letto.
    thread.customerUnread = (thread.customerUnread || 0) + 1
    thread.storeUnread = (thread.storeUnread || 0) + 1
  } else if (from === 'customer') {
    thread.storeUnread = (thread.storeUnread || 0) + 1
    thread.customerUnread = 0
  } else {
    thread.customerUnread = (thread.customerUnread || 0) + 1
    thread.storeUnread = 0
  }
  return message
}

// ---------------------------------------------------------------------------
// Permessi: un contenuto non generico di un altro negozio è utilizzabile solo
// con una concessione esplicita, attiva e non scaduta.
// ---------------------------------------------------------------------------
function hasGrant(data, { ownerStoreId, requesterStoreId, productId, scope }) {
  return data.permissions.some(
    (p) =>
      p.ownerStoreId === ownerStoreId &&
      p.requesterStoreId === requesterStoreId &&
      p.productId === productId &&
      p.status === 'granted' &&
      p.scopes.includes(scope) &&
      (!p.expiresAt || new Date(p.expiresAt).getTime() > Date.now()),
  )
}

function decorateImage(data, image, viewerStoreId) {
  const own = image.ownerStoreId === viewerStoreId
  let usable = own || image.generic
  let reason = own ? 'own' : image.generic ? 'generic' : 'denied'
  if (!usable && hasGrant(data, {
    ownerStoreId: image.ownerStoreId,
    requesterStoreId: viewerStoreId,
    productId: image.productId,
    scope: 'images',
  })) {
    usable = true
    reason = 'granted'
  }
  const owner = data.stores.find((s) => s.id === image.ownerStoreId)
  return { ...image, usable, usableReason: reason, ownerStoreName: owner?.name || '—' }
}

async function resolveImageUrls(image) {
  if (image.storage !== 'idb') return image
  const [fullUrl, coverUrl] = await Promise.all([
    mediaStore.get(image.fullKey),
    mediaStore.get(image.coverKey),
  ])
  return { ...image, fullUrl: fullUrl || '', coverUrl: coverUrl || fullUrl || '' }
}

// ---------------------------------------------------------------------------

export const localAdapter = {
  mode: 'demo',

  // ---- Negozi -------------------------------------------------------------
  async listStores() {
    return ok(db.read().stores)
  },

  async getStore(id) {
    const store = db.read().stores.find((s) => s.id === id)
    if (!store) fail('Negozio non trovato', 404)
    return ok(store)
  },

  async createStore(input) {
    return ok(
      db.write((data) => {
        const store = {
          id: uid('store'),
          active: true,
          country: 'Italia',
          responseHours: 24,
          areas: [],
          // Capacita del venditore: nessun servizio attivo e un calendario
          // prudente, da correggere nel profilo.
          services: emptySellerServices(),
          delivery: emptySellerDelivery(),
          coordinates: null,
          createdAt: new Date().toISOString(),
          ...input,
        }
        data.stores.push(store)
        return store
      }),
    )
  },

  async updateStore(id, patch) {
    return ok(
      db.write((data) => {
        const store = data.stores.find((s) => s.id === id)
        if (!store) fail('Negozio non trovato', 404)
        Object.assign(store, patch, { updatedAt: new Date().toISOString() })
        return store
      }),
    )
  },

  // ---- Catalogo globale ---------------------------------------------------
  async searchProducts({ q = '', category = '', brand = '' } = {}) {
    const data = db.read()
    const needle = q.trim().toLowerCase()
    const items = data.products
      .filter((p) => !category || p.category === category)
      .filter((p) => !brand || p.brand === brand)
      .filter(
        (p) =>
          !needle ||
          p.name.toLowerCase().includes(needle) ||
          p.brand.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle),
      )
      .map((p) => ({
        ...p,
        sellersCount: data.listings.filter((l) => l.productId === p.id && l.status !== 'draft').length,
        imagesCount: data.images.filter((i) => i.productId === p.id).length,
      }))
    return ok(items)
  },

  async getProduct(id) {
    const data = db.read()
    const product = data.products.find((p) => p.id === id)
    if (!product) fail('Prodotto non trovato', 404)
    return ok(product)
  },

  /** Verifica di unicità usata in tempo reale mentre si compila il nuovo prodotto. */
  async findDuplicate({ brand, name }) {
    const key = catalogKey({ brand, name })
    if (!key) return ok(null)
    const data = db.read()
    const exact = data.products.find((p) => p.catalogKey === key)
    if (exact) return ok({ match: 'exact', product: exact })
    const needle = (name || '').trim().toLowerCase()
    if (needle.length < 4) return ok(null)
    const similar = data.products.find(
      (p) => p.name.toLowerCase().includes(needle) || needle.includes(p.name.toLowerCase()),
    )
    return ok(similar ? { match: 'similar', product: similar } : null)
  },

  async createProduct(input) {
    const key = catalogKey(input)
    return ok(
      db.write((data) => {
        const existing = data.products.find((p) => p.catalogKey === key)
        if (existing) {
          fail('Questo prodotto è già in catalogo', 409, { product: clone(existing) })
        }
        const product = {
          id: uid('cat'),
          catalogKey: key,
          name: input.name,
          brand: input.brand,
          category: input.category,
          description: input.description || '',
          specs: input.specs || {},
          createdByStoreId: input.createdByStoreId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        data.products.push(product)
        return product
      }),
    )
  },

  async updateProduct(id, patch, storeId) {
    return ok(
      db.write((data) => {
        const product = data.products.find((p) => p.id === id)
        if (!product) fail('Prodotto non trovato', 404)
        if (product.createdByStoreId !== storeId) {
          fail('Solo il negozio che ha creato la scheda può modificarla', 403)
        }
        Object.assign(product, patch, { updatedAt: new Date().toISOString() })
        return product
      }),
    )
  },

  // ---- Immagini -----------------------------------------------------------
  async listProductImages(productId, viewerStoreId) {
    const data = db.read()
    const images = data.images.filter((i) => i.productId === productId && i.status === 'active')
    const resolved = await Promise.all(images.map(resolveImageUrls))
    return ok(resolved.map((img) => decorateImage(data, img, viewerStoreId)))
  },

  async uploadImage({ productId, storeId, file, caption = '', generic = false }) {
    const prepared = await prepareImage(file)
    const id = uid('img')
    const fullKey = `products/${productId}/${id}/full.webp`
    const coverKey = `products/${productId}/${id}/cover.webp`
    await mediaStore.put(fullKey, prepared.fullDataUrl)
    await mediaStore.put(coverKey, prepared.coverDataUrl)
    const record = db.write((data) => {
      const image = {
        id,
        productId,
        ownerStoreId: storeId,
        caption,
        generic,
        storage: 'idb',
        fullKey,
        coverKey,
        width: prepared.width,
        height: prepared.height,
        bytes: prepared.bytes,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
      data.images.push(image)
      return image
    })
    const withUrls = await resolveImageUrls(record)
    return ok(decorateImage(db.read(), withUrls, storeId))
  },

  async updateImage(id, patch, storeId) {
    return ok(
      db.write((data) => {
        const image = data.images.find((i) => i.id === id)
        if (!image) fail('Immagine non trovata', 404)
        if (image.ownerStoreId !== storeId) fail('Immagine di un altro negozio', 403)
        Object.assign(image, patch)
        return image
      }),
    )
  },

  async deleteImage(id, storeId) {
    return ok(
      db.write((data) => {
        const image = data.images.find((i) => i.id === id)
        if (!image) fail('Immagine non trovata', 404)
        if (image.ownerStoreId !== storeId) fail('Immagine di un altro negozio', 403)
        image.status = 'deleted'
        // Rimuove il riferimento dalle proposte che la usavano.
        data.listings.forEach((l) => {
          l.images = (l.images || []).filter((ref) => ref.imageId !== id)
        })
        return { id }
      }),
    )
  },

  // ---- Proposte di vendita ------------------------------------------------
  async listListingsByStore(storeId) {
    const data = db.read()
    const listings = data.listings.filter((l) => l.storeId === storeId)
    const withCovers = await Promise.all(
      listings.map(async (l) => ({
        ...l,
        product: data.products.find((p) => p.id === l.productId) || null,
        coverUrl: await coverUrlFor(data, l),
      })),
    )
    return ok(withCovers)
  },

  async listListingsByProduct(productId) {
    const data = db.read()
    return ok(
      data.listings
        .filter((l) => l.productId === productId)
        .map((l) => ({ ...l, store: data.stores.find((s) => s.id === l.storeId) || null })),
    )
  },

  async getListing(storeId, productId) {
    const data = db.read()
    const listing = data.listings.find((l) => l.storeId === storeId && l.productId === productId)
    return ok(listing || null)
  },

  async createListing(storeId, productId) {
    return ok(
      db.write((data) => {
        const exists = data.listings.find((l) => l.storeId === storeId && l.productId === productId)
        if (exists) fail('Hai già una proposta per questo prodotto', 409, { listing: clone(exists) })
        const listing = {
          ...emptyListing(storeId, productId),
          id: `${storeId}#${productId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        data.listings.push(listing)
        return listing
      }),
    )
  },

  async saveListing(listing) {
    return ok(
      db.write((data) => {
        const idx = data.listings.findIndex(
          (l) => l.storeId === listing.storeId && l.productId === listing.productId,
        )
        const next = { ...listing, updatedAt: new Date().toISOString() }
        if (idx === -1) data.listings.push(next)
        else data.listings[idx] = { ...data.listings[idx], ...next }
        return next
      }),
    )
  },

  async deleteListing(storeId, productId) {
    return ok(
      db.write((data) => {
        data.listings = data.listings.filter(
          (l) => !(l.storeId === storeId && l.productId === productId),
        )
        return { storeId, productId }
      }),
    )
  },

  // ---- Permessi -----------------------------------------------------------
  async listPermissions(storeId) {
    const data = db.read()
    const decorate = (p) => ({
      ...p,
      ownerStore: data.stores.find((s) => s.id === p.ownerStoreId) || null,
      requesterStore: data.stores.find((s) => s.id === p.requesterStoreId) || null,
      product: data.products.find((pr) => pr.id === p.productId) || null,
    })
    return ok({
      incoming: data.permissions.filter((p) => p.ownerStoreId === storeId).map(decorate),
      outgoing: data.permissions.filter((p) => p.requesterStoreId === storeId).map(decorate),
    })
  },

  async requestPermission(input) {
    return ok(
      db.write((data) => {
        const dup = data.permissions.find(
          (p) =>
            p.productId === input.productId &&
            p.ownerStoreId === input.ownerStoreId &&
            p.requesterStoreId === input.requesterStoreId &&
            ['pending', 'granted'].includes(p.status),
        )
        if (dup) fail('Esiste già una richiesta attiva per questo contenuto', 409)
        const permission = {
          id: uid('perm'),
          status: 'pending',
          responseNote: '',
          expiresAt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...input,
        }
        data.permissions.push(permission)
        return permission
      }),
    )
  },

  async updatePermission(id, patch, storeId) {
    return ok(
      db.write((data) => {
        const permission = data.permissions.find((p) => p.id === id)
        if (!permission) fail('Richiesta non trovata', 404)
        if (permission.ownerStoreId !== storeId) {
          fail('Solo il proprietario dei contenuti può rispondere', 403)
        }
        Object.assign(permission, patch, { updatedAt: new Date().toISOString() })
        return permission
      }),
    )
  },

  // ---- Ordini ricevuti ----------------------------------------------------
  // In demo gli ordini non arrivano da nessuna parte: il dataset ne contiene
  // alcuni gia' pronti, cosi' la pagina si puo' provare senza il sito pubblico.
  // Accettare / rifiutare / riprogrammare mutano lo stesso record e scrivono un
  // messaggio di servizio nella chat locale, cosi' la demo racconta la stessa
  // storia che racconterebbe la Lambda.
  async listFulfilments(storeId) {
    const rows = (db.read().fulfilments || []).filter((f) => f.storeId === storeId)
    rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    return ok(rows)
  },

  async acceptFulfilment(id, storeId) {
    return ok(
      db.write((data) => {
        const f = findFulfilment(data, id, storeId)
        if (f.status !== 'pending') fail('Questa consegna non è più da confermare', 409)
        f.status = 'accepted'
        f.confirmedDate = f.requestedDate
        f.proposedDate = null
        f.respondedAt = new Date().toISOString()
        f.updatedAt = f.respondedAt
        postLocalMessage(data, f, {
          from: 'system',
          kind: 'service',
          text: `${f.storeName} ha confermato la consegna per il ${f.confirmedDate}.`,
        })
        return f
      }),
    )
  },

  async rejectFulfilment(id, storeId, reason) {
    return ok(
      db.write((data) => {
        const f = findFulfilment(data, id, storeId)
        if (f.status !== 'pending' && f.status !== 'rescheduled') {
          fail('Questa consegna non può più essere rifiutata', 409)
        }
        const note = (reason || '').trim().slice(0, 400)
        f.status = 'rejected'
        f.sellerNote = note
        f.proposedDate = null
        f.respondedAt = new Date().toISOString()
        f.updatedAt = f.respondedAt
        postLocalMessage(data, f, {
          from: 'system',
          kind: 'service',
          text: note
            ? `${f.storeName} non può evadere questo ordine: ${note}`
            : `${f.storeName} non può evadere questo ordine.`,
        })
        return f
      }),
    )
  },

  async rescheduleFulfilment(id, storeId, date, note) {
    return ok(
      db.write((data) => {
        const f = findFulfilment(data, id, storeId)
        if (f.status !== 'pending' && f.status !== 'rescheduled') {
          fail('Questa consegna non può più essere riprogrammata', 409)
        }
        const store = data.stores.find((s) => s.id === storeId)
        if (!sellerAcceptsDate(store?.delivery, date)) {
          fail('Questa data non è fra quelle che consegni', 400)
        }
        const cleanNote = (note || '').trim().slice(0, 400)
        f.status = 'rescheduled'
        f.proposedDate = date
        f.sellerNote = cleanNote
        f.respondedAt = null
        f.updatedAt = new Date().toISOString()
        postLocalMessage(data, f, {
          from: 'system',
          kind: 'service',
          text: cleanNote
            ? `${f.storeName} propone il ${date} invece del ${f.requestedDate}: ${cleanNote}`
            : `${f.storeName} propone il ${date} invece del ${f.requestedDate}.`,
        })
        return f
      }),
    )
  },

  async deliverFulfilment(id, storeId) {
    return ok(
      db.write((data) => {
        const f = findFulfilment(data, id, storeId)
        if (f.status !== 'accepted') {
          fail('Solo una consegna confermata può essere segnata come consegnata', 409)
        }
        f.status = 'delivered'
        f.updatedAt = new Date().toISOString()
        postLocalMessage(data, f, {
          from: 'system',
          kind: 'service',
          text: `${f.storeName} ha consegnato l'ordine.`,
        })
        return f
      }),
    )
  },

  // ---- Chat -----------------------------------------------------------------
  // Una conversazione per consegna, esattamente come sul marketplace: qui vive
  // solo il lato negozio, l'id coincide con quello della consegna.
  async listThreads(storeId) {
    const data = db.read()
    const rows = (data.chatThreads || []).filter((t) => t.storeId === storeId)
    rows.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''))
    return ok(rows)
  },

  async getThreadMessages(threadId, storeId) {
    const data = db.read()
    const thread = (data.chatThreads || []).find((t) => t.id === threadId)
    if (!thread) fail('Conversazione non trovata', 404)
    if (thread.storeId !== storeId) fail('Non hai accesso a questa conversazione', 403)
    return ok(
      db.write((writable) => {
        const wThread = writable.chatThreads.find((t) => t.id === threadId)
        wThread.storeUnread = 0
        const messages = (writable.chatMessages || [])
          .filter((m) => m.threadId === threadId)
          .sort((a, b) => a.at.localeCompare(b.at))
        return { thread: wThread, messages }
      }),
    )
  },

  async sendThreadMessage(threadId, storeId, text) {
    const clean = (text || '').trim().slice(0, 2000)
    if (!clean) fail('Il messaggio non può essere vuoto', 400)
    return ok(
      db.write((data) => {
        const thread = (data.chatThreads || []).find((t) => t.id === threadId)
        if (!thread) fail('Conversazione non trovata', 404)
        if (thread.storeId !== storeId) fail('Non hai accesso a questa conversazione', 403)
        const fulfilment = (data.fulfilments || []).find((f) => f.id === threadId)
        return postLocalMessage(data, fulfilment || thread, {
          from: 'store',
          authorName: thread.storeName,
          text: clean,
        })
      }),
    )
  },

  async listReports(storeId) {
    const data = db.read()
    const decorate = (r) => ({
      ...r,
      reporterStore: data.stores.find((s) => s.id === r.reporterStoreId) || null,
      targetOwnerStore: data.stores.find((s) => s.id === r.targetOwnerStoreId) || null,
      targetLabel: describeTarget(data, r),
    })
    return ok({
      sent: data.reports.filter((r) => r.reporterStoreId === storeId).map(decorate),
      received: data.reports.filter((r) => r.targetOwnerStoreId === storeId).map(decorate),
    })
  },

  async createReport(input) {
    return ok(
      db.write((data) => {
        const report = {
          id: uid('rep'),
          status: 'open',
          resolutionNote: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...input,
        }
        data.reports.push(report)
        return report
      }),
    )
  },

  async updateReport(id, patch, storeId) {
    return ok(
      db.write((data) => {
        const report = data.reports.find((r) => r.id === id)
        if (!report) fail('Segnalazione non trovata', 404)
        if (report.targetOwnerStoreId !== storeId) {
          fail('Solo il negozio segnalato può aggiornare lo stato', 403)
        }
        Object.assign(report, patch, { updatedAt: new Date().toISOString() })
        return report
      }),
    )
  },

  // ---- Utilità demo -------------------------------------------------------
  async resetDemoData() {
    db.reset()
    return ok({ done: true })
  },
}

async function coverUrlFor(data, listing) {
  const ref = (listing.images || []).find((i) => i.role === 'cover') || (listing.images || [])[0]
  if (!ref) return null
  const image = data.images.find((i) => i.id === ref.imageId)
  if (!image) return null
  if (image.storage !== 'idb') return image.coverUrl || null
  return (await mediaStore.get(image.coverKey)) || null
}

function describeTarget(data, report) {
  if (report.targetType === 'product') {
    const p = data.products.find((x) => x.id === report.targetId)
    return p ? `${p.brand} — ${p.name}` : report.targetId
  }
  if (report.targetType === 'image') {
    const img = data.images.find((x) => x.id === report.targetId)
    const p = img && data.products.find((x) => x.id === img.productId)
    return img ? `Foto "${img.caption || 'senza didascalia'}"${p ? ` · ${p.name}` : ''}` : report.targetId
  }
  if (report.targetType === 'listing') {
    const [storeId, productId] = String(report.targetId).split('#')
    const s = data.stores.find((x) => x.id === storeId)
    const p = data.products.find((x) => x.id === productId)
    return `${p?.name || productId} presso ${s?.name || storeId}`
  }
  const s = data.stores.find((x) => x.id === report.targetId)
  return s?.name || report.targetId
}
