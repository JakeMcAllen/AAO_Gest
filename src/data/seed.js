// Dataset dimostrativo caricato al primo avvio in modalità demo.
// Rappresenta lo scenario chiave del gestionale: uno stesso prodotto di
// catalogo venduto da più negozi, ognuno con foto, listino e servizi propri.

import { placeholderImage } from '../api/media.js'
import {
  catalogKey,
  emptyListing,
  emptyPricing,
  emptyServices,
  emptySellerDelivery,
  emptySellerServices,
  slugify,
} from '../domain.js'
import { coordsOfCity } from './geo.js'

const now = Date.now()
const iso = (daysAgo = 0) => new Date(now - daysAgo * 86400000).toISOString()
const inDays = (days) => new Date(now + days * 86400000).toISOString().slice(0, 10)

// ---- Negozi ---------------------------------------------------------------
const STORES = [
  {
    id: 'store-moderno',
    name: 'Moderno Living',
    tagline: 'Design contemporaneo per la casa',
    description:
      "Showroom di 900 m² in zona Tortona, specializzato in imbottiti e sistemi giorno delle grandi firme italiane. Servizio di progettazione interna e montaggio con squadra propria.",
    email: 'anna@modernoliving.it',
    phone: '+39 02 4567 890',
    address: 'Via Tortona 34',
    city: 'Milano',
    region: 'Lombardia',
    postalCode: '20144',
    areas: [
      { type: 'city', name: 'Milano', region: 'Lombardia' },
      { type: 'city', name: 'Monza', region: 'Lombardia' },
      { type: 'city', name: 'Como', region: 'Lombardia' },
      { type: 'region', name: 'Lombardia', region: 'Lombardia' },
    ],
  },
  {
    id: 'store-artigiana',
    name: 'Falegnameria Artigiana',
    tagline: 'Legno su misura dal 1962',
    description:
      'Laboratorio artigiano di terza generazione: realizziamo su misura in rovere, noce e frassino e rivendiamo una selezione di marchi compatibili con le nostre finiture.',
    email: 'marco@artigiana.it',
    phone: '+39 051 223 445',
    address: 'Via del Legno 12',
    city: 'Bologna',
    region: 'Emilia-Romagna',
    postalCode: '40122',
    areas: [
      { type: 'city', name: 'Bologna', region: 'Emilia-Romagna' },
      { type: 'city', name: 'Modena', region: 'Emilia-Romagna' },
      { type: 'region', name: 'Emilia-Romagna', region: 'Emilia-Romagna' },
    ],
  },
  {
    id: 'store-comfort',
    name: 'Comfort Zone',
    tagline: 'Zona notte e relax',
    description:
      'Specialisti della zona notte: letti, materassi e armadiature. Rilievo misure gratuito su Roma e provincia, consegna e montaggio entro 15 giorni.',
    email: 'giulia@comfortzone.it',
    phone: '+39 06 998 7766',
    address: 'Viale Marconi 210',
    city: 'Roma',
    region: 'Lazio',
    postalCode: '00146',
    areas: [
      { type: 'city', name: 'Roma', region: 'Lazio' },
      { type: 'city', name: 'Latina', region: 'Lazio' },
      { type: 'region', name: 'Lazio', region: 'Lazio' },
    ],
  },
  {
    id: 'store-nordic',
    name: 'Nordic Casa',
    tagline: 'Essenzialità scandinava',
    description:
      'Selezione di arredi nordici e illuminazione tecnica. Rivenditore autorizzato per il Piemonte di alcuni marchi di design.',
    email: 'luca@nordiccasa.it',
    phone: '+39 011 334 221',
    address: 'Corso Francia 88',
    city: 'Torino',
    region: 'Piemonte',
    postalCode: '10138',
    areas: [
      { type: 'city', name: 'Torino', region: 'Piemonte' },
      { type: 'region', name: 'Piemonte', region: 'Piemonte' },
    ],
  },
]

// ---- Catalogo globale ------------------------------------------------------
const PRODUCTS = [
  {
    id: 'cat-tulip',
    brand: 'Moroso',
    name: 'Divano Tulip 3 posti',
    category: 'Divani',
    createdBy: 'store-moderno',
    description:
      'Divano tre posti con struttura in acciaio e imbottitura in poliuretano a densità differenziata. Rivestimento sfoderabile.',
    specs: { Larghezza: '220 cm', Profondità: '95 cm', Altezza: '78 cm', Sedute: '3' },
  },
  {
    id: 'cat-bohemien',
    brand: 'Moroso',
    name: 'Poltrona Bohemien',
    category: 'Poltrone',
    createdBy: 'store-moderno',
    description: 'Poltrona lounge dalla scocca avvolgente, base girevole in alluminio verniciato.',
    specs: { Larghezza: '86 cm', Profondità: '82 cm', Altezza: '104 cm' },
  },
  {
    id: 'cat-ripiego',
    brand: 'Cassina',
    name: 'Tavolo Ripiego allungabile',
    category: 'Tavoli',
    createdBy: 'store-artigiana',
    description: 'Tavolo allungabile con piano in rovere e prolunghe a scomparsa, gambe a sezione conica.',
    specs: { Larghezza: '160-240 cm', Profondità: '90 cm', Altezza: '75 cm' },
  },
  {
    id: 'cat-cab412',
    brand: 'Cassina',
    name: 'Sedia Cab 412',
    category: 'Sedie',
    createdBy: 'store-artigiana',
    description: 'Sedia con scheletro in acciaio rivestito da una pelle sagomata chiusa da cerniere.',
    specs: { Larghezza: '47 cm', Profondità: '52 cm', Altezza: '82 cm' },
  },
  {
    id: 'cat-nathalie',
    brand: 'Flou',
    name: 'Letto Nathalie matrimoniale',
    category: 'Letti',
    createdBy: 'store-comfort',
    description: 'Il letto tessile per eccellenza: testata morbida con lenzuolo avvolgente e cinghie in pelle.',
    specs: { Rete: '160x200 cm', Altezza: '105 cm', Contenitore: 'Opzionale' },
  },
  {
    id: 'cat-malibu',
    brand: 'Flou',
    name: 'Armadio Malibu',
    category: 'Armadi',
    createdBy: 'store-comfort',
    description: 'Armadio ad ante battenti con profilo in alluminio e ante in vetro laccato.',
    specs: { Larghezza: 'modulare', Profondità: '62 cm', Altezza: '260 cm' },
  },
  {
    id: 'cat-lux',
    brand: 'Snaidero',
    name: 'Cucina Lux',
    category: 'Cucine',
    createdBy: 'store-moderno',
    description: 'Sistema cucina con ante a gola integrata, top in gres e isola attrezzata.',
    specs: { Composizione: 'su progetto', Top: 'gres 12 mm' },
  },
  {
    id: 'cat-infinito',
    brand: 'Molteni',
    name: 'Libreria Infinito',
    category: 'Librerie',
    createdBy: 'store-nordic',
    description: 'Libreria bifacciale autoportante a montanti verticali, componibile in altezza e larghezza.',
    specs: { Modulo: '90 cm', Profondità: '32 cm' },
  },
  {
    id: 'cat-tolomeo',
    brand: 'Artemide',
    name: 'Lampada Tolomeo da tavolo',
    category: 'Illuminazione',
    createdBy: 'store-nordic',
    description: 'Lampada a bracci snodabili in alluminio con sistema a cavi in acciaio.',
    specs: { Sbraccio: '130 cm', Attacco: 'E27' },
  },
  {
    id: 'cat-costa',
    brand: 'Talenti',
    name: 'Tavolo outdoor Costa',
    category: 'Outdoor',
    createdBy: 'store-nordic',
    description: 'Tavolo da esterno con struttura in alluminio verniciato e piano in gres effetto pietra.',
    specs: { Larghezza: '220 cm', Profondità: '100 cm' },
  },
]

// ---- Immagini --------------------------------------------------------------
// generic = condivisa con tutto il catalogo, riutilizzabile da chiunque.
const IMAGE_PLAN = [
  ['cat-tulip', 'store-moderno', 'Ambientata showroom Tortona', true],
  ['cat-tulip', 'store-moderno', 'Dettaglio cucitura', false],
  ['cat-tulip', 'store-comfort', 'Versione tessuto écru', false],
  ['cat-bohemien', 'store-moderno', 'Fronte', true],
  ['cat-ripiego', 'store-artigiana', 'Piano rovere naturale', true],
  ['cat-ripiego', 'store-artigiana', 'Meccanismo prolunga', false],
  ['cat-cab412', 'store-artigiana', 'Pelle cuoio', true],
  ['cat-nathalie', 'store-comfort', 'Testata sfoderabile', true],
  ['cat-nathalie', 'store-comfort', 'Ambientata camera', false],
  ['cat-malibu', 'store-comfort', 'Ante vetro laccato', true],
  ['cat-lux', 'store-moderno', 'Isola attrezzata', true],
  ['cat-infinito', 'store-nordic', 'Composizione bifacciale', true],
  ['cat-tolomeo', 'store-nordic', 'Su scrivania', true],
  ['cat-costa', 'store-nordic', 'Terrazza', true],
]

// ---- Proposte di vendita ---------------------------------------------------
// [productId, storeId, disponibilità, listino, servizi attivi]
const LISTING_PLAN = [
  ['cat-tulip', 'store-moderno', { mode: 'reseller', to: inDays(280) }, 'variant-matrix', ['montaggio', 'consegna', 'ritiro_usato']],
  ['cat-tulip', 'store-comfort', { mode: 'stock', qty: 3 }, 'flat', ['consegna']],
  ['cat-tulip', 'store-nordic', { mode: 'reseller', to: inDays(21) }, 'qty-tiers', ['montaggio', 'garanzia_estesa']],
  ['cat-bohemien', 'store-moderno', { mode: 'stock', qty: 6 }, 'variant-matrix', ['consegna']],
  ['cat-ripiego', 'store-artigiana', { mode: 'reseller', to: inDays(400) }, 'size-grid', ['montaggio', 'rilievo_misure', 'consegna']],
  ['cat-ripiego', 'store-nordic', { mode: 'stock', qty: 1 }, 'flat', ['consegna']],
  ['cat-cab412', 'store-artigiana', { mode: 'stock', qty: 24 }, 'qty-tiers', ['consegna']],
  ['cat-nathalie', 'store-comfort', { mode: 'reseller', to: inDays(150) }, 'size-grid', ['montaggio', 'ritiro_usato', 'garanzia_estesa']],
  ['cat-malibu', 'store-comfort', { mode: 'stock', qty: 2 }, 'flat', ['montaggio', 'rilievo_misure']],
  ['cat-lux', 'store-moderno', { mode: 'reseller', to: inDays(500) }, 'custom', ['montaggio', 'rilievo_misure', 'consegna', 'ritiro_usato']],
  ['cat-infinito', 'store-nordic', { mode: 'stock', qty: 0 }, 'size-grid', ['montaggio']],
  ['cat-tolomeo', 'store-nordic', { mode: 'stock', qty: 15 }, 'qty-tiers', ['consegna']],
  ['cat-costa', 'store-nordic', { mode: 'reseller', to: inDays(60) }, 'flat', ['consegna', 'montaggio']],
]

const PRICE_SEED = {
  'cat-tulip': { flat: 3200, tiers: [2980, 2790, 2590], grid: [], matrix: [['Tessuto sfoderabile', 'Naturale', 3200], ['Velluto', 'Opaco', 3650], ['Pelle fiore', 'Naturale', 4400]] },
  'cat-bohemien': { flat: 1850, matrix: [['Bouclé', 'Naturale', 1850], ['Velluto', 'Opaco', 1990]] },
  'cat-ripiego': { flat: 2450, grid: [[160, 90, 2450], [200, 90, 2790], [240, 100, 3150]] },
  'cat-cab412': { flat: 690, tiers: [690, 650, 610] },
  'cat-nathalie': { flat: 2980, grid: [[160, 200, 2980], [180, 200, 3240]] },
  'cat-malibu': { flat: 3600 },
  'cat-lux': { flat: 14500 },
  'cat-infinito': { flat: 1290, grid: [[90, 32, 1290], [180, 32, 2380]] },
  'cat-tolomeo': { flat: 320, tiers: [320, 299, 279] },
  'cat-costa': { flat: 2100 },
}

// ---- Capacita' di ogni negozio -------------------------------------------
// Cosa sa fare, quando consegna. Il sito pubblico legge questi campi per capire
// a chi puo' proporre il compratore e in che date.
const STORE_CAPABILITIES = {
  'store-moderno': {
    // Squadra propria: consegna e monta, dal lunedi' al venerdi'.
    services: {
      trasporto: { enabled: true, priceMode: 'free', price: 0 },
      montaggio: { enabled: true, priceMode: 'fixed', price: 180 },
      consegna_al_piano: { enabled: true, priceMode: 'per_unit', price: 25, unit: 'piano' },
      rilievo_misure: { enabled: true, priceMode: 'fixed', price: 120 },
      ritiro_usato: { enabled: true, priceMode: 'fixed', price: 90 },
    },
    delivery: { weekdays: [1, 2, 3, 4, 5], leadTimeDays: 14, slotsPerDay: 4, horizonDays: 120 },
  },
  'store-artigiana': {
    // Laboratorio: produce su misura, quindi preavviso lungo e consegne solo
    // due giorni a settimana.
    services: {
      trasporto: { enabled: true, priceMode: 'fixed', price: 120 },
      montaggio: { enabled: true, priceMode: 'fixed', price: 220 },
      rilievo_misure: { enabled: true, priceMode: 'free', price: 0 },
      garanzia_estesa: { enabled: true, priceMode: 'percent', price: 5 },
    },
    delivery: { weekdays: [2, 5], leadTimeDays: 35, slotsPerDay: 2, horizonDays: 180 },
  },
  'store-comfort': {
    services: {
      trasporto: { enabled: true, priceMode: 'fixed', price: 79 },
      consegna_al_piano: { enabled: true, priceMode: 'fixed', price: 60 },
      ritiro_usato: { enabled: true, priceMode: 'fixed', price: 70 },
    },
    delivery: { weekdays: [1, 3, 5, 6], leadTimeDays: 10, slotsPerDay: 6, horizonDays: 90 },
  },
  'store-nordic': {
    services: {
      trasporto: { enabled: true, priceMode: 'free', price: 0 },
      montaggio: { enabled: true, priceMode: 'quote', price: 0 },
    },
    delivery: { weekdays: [1, 2, 3, 4], leadTimeDays: 21, slotsPerDay: 3, horizonDays: 120 },
  },
}

/** Fonde le capacita' dichiarate con i valori di default del dominio. */
function capabilitiesOf(storeId) {
  const caps = STORE_CAPABILITIES[storeId] || {}
  const services = emptySellerServices().map((base) => {
    const override = (caps.services || {})[base.type]
    return override ? { ...base, ...override } : base
  })
  return { services, delivery: { ...emptySellerDelivery(), ...(caps.delivery || {}) } }
}

// [negozio, prodotto, cliente, citta', pezzi, giorni alla consegna, stato]
// Solo coppie negozio/prodotto che esistono davvero in LISTING_PLAN: cosi' il
// prezzo della riga viene dal listino vero e la demo non mente.
const FULFILMENT_PLAN = [
  ['store-moderno', 'cat-tulip', 'Giulia Rossi', 'Milano', 1, 12, 'pending'],
  ['store-moderno', 'cat-bohemien', 'Marco Bianchi', 'Monza', 2, 19, 'pending'],
  ['store-artigiana', 'cat-ripiego', 'Elena Conti', 'Bologna', 1, 38, 'accepted'],
  ['store-comfort', 'cat-nathalie', 'Davide Ferri', 'Roma', 1, 11, 'accepted'],
  ['store-moderno', 'cat-lux', 'Sara Greco', 'Como', 1, 26, 'pending'],
]

/** Prezzo piu' basso del listino di una proposta, per le righe dell'ordine. */
function priceOfListing(listing) {
  const priceCols = (listing.pricing?.columns || []).filter((c) => c.type === 'price').map((c) => c.key)
  const values = (listing.pricing?.rows || [])
    .flatMap((row) => priceCols.map((k) => Number(row[k])))
    .filter((n) => Number.isFinite(n) && n > 0)
  return values.length ? Math.min(...values) : 1200
}

export function buildSeed() {
  const createdAt = iso(120)

  const stores = STORES.map((s, i) => ({
    ...s,
    slug: slugify(s.name),
    logoUrl: placeholderImage(s.name, s.id, i),
    coverUrl: placeholderImage(s.tagline, `${s.id}-cover`, i + 3),
    country: 'Italia',
    active: true,
    responseHours: 24,
    // La citta' posiziona il negozio sulla mappa del sito pubblico.
    coordinates: coordsOfCity(s.city),
    ...capabilitiesOf(s.id),
    createdAt,
  }))

  const products = PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
    specs: p.specs,
    catalogKey: catalogKey({ brand: p.brand, name: p.name }),
    createdByStoreId: p.createdBy,
    createdAt,
    updatedAt: createdAt,
  }))

  const images = IMAGE_PLAN.map(([productId, ownerStoreId, caption, generic], i) => {
    const product = PRODUCTS.find((p) => p.id === productId)
    return {
      id: `img-${productId}-${i}`,
      productId,
      ownerStoreId,
      caption,
      generic,
      storage: 'inline',
      fullUrl: placeholderImage(product.name, `${productId}-${i}`, i),
      coverUrl: placeholderImage(product.name, `${productId}-${i}`, i),
      width: 800,
      height: 600,
      bytes: 2400,
      status: 'active',
      createdAt: iso(90 - i),
    }
  })

  const listings = LISTING_PLAN.map(([productId, storeId, avail, priceModel, services]) => {
    const listing = emptyListing(storeId, productId)
    listing.id = `${storeId}#${productId}`
    listing.status = 'published'
    listing.sku = `${storeId.replace('store-', '').slice(0, 3).toUpperCase()}-${productId.replace('cat-', '').toUpperCase()}`
    listing.createdAt = iso(60)
    listing.updatedAt = iso(Math.floor(Math.random() * 20))

    listing.availability =
      avail.mode === 'reseller'
        ? { mode: 'reseller', stockQty: 0, lowStockThreshold: 2, resellerFrom: inDays(-90), resellerTo: avail.to, leadTimeDays: 21, note: 'Accordo di rivendita con il produttore' }
        : { mode: 'stock', stockQty: avail.qty, lowStockThreshold: 2, resellerFrom: '', resellerTo: '', leadTimeDays: 7, note: '' }

    // Foto: le proprie più le generiche del catalogo, la prima è la copertina.
    const usable = images.filter((im) => im.productId === productId && (im.ownerStoreId === storeId || im.generic))
    listing.images = usable.slice(0, 4).map((im, idx) => ({
      imageId: im.id,
      role: idx === 0 ? 'cover' : 'gallery',
      order: idx,
    }))

    listing.characteristics = buildCharacteristics(productId)
    listing.pricing = buildPricing(productId, priceModel)
    listing.services = emptyServices().map((s) =>
      services.includes(s.type)
        ? { ...s, enabled: true, price: servicePrice(s.type), notes: '' }
        : s,
    )
    return listing
  })

  const permissions = [
    {
      id: 'perm-1',
      productId: 'cat-tulip',
      ownerStoreId: 'store-moderno',
      requesterStoreId: 'store-comfort',
      scopes: ['images', 'description'],
      status: 'granted',
      message: 'Vorremmo usare le vostre foto ambientate per la scheda su Roma.',
      responseNote: 'Concesso, citate il nostro showroom nella didascalia.',
      expiresAt: inDays(365),
      createdAt: iso(40),
      updatedAt: iso(38),
    },
    {
      id: 'perm-2',
      productId: 'cat-ripiego',
      ownerStoreId: 'store-artigiana',
      requesterStoreId: 'store-nordic',
      scopes: ['images'],
      status: 'pending',
      message: 'Ci servirebbe la foto del meccanismo di prolunga per la scheda prodotto.',
      responseNote: '',
      expiresAt: '',
      createdAt: iso(6),
      updatedAt: iso(6),
    },
    {
      id: 'perm-3',
      productId: 'cat-nathalie',
      ownerStoreId: 'store-comfort',
      requesterStoreId: 'store-moderno',
      scopes: ['images', 'price_table'],
      status: 'pending',
      message: 'Riutilizzeremmo la struttura del vostro listino per le misure speciali.',
      responseNote: '',
      expiresAt: '',
      createdAt: iso(2),
      updatedAt: iso(2),
    },
    {
      id: 'perm-4',
      productId: 'cat-lux',
      ownerStoreId: 'store-moderno',
      requesterStoreId: 'store-artigiana',
      scopes: ['services'],
      status: 'revoked',
      message: 'Vorremmo riprendere la vostra configurazione servizi.',
      responseNote: 'Revocato: cambiate le condizioni di montaggio.',
      expiresAt: '',
      createdAt: iso(80),
      updatedAt: iso(15),
    },
  ]

  const reports = [
    {
      id: 'rep-1',
      targetType: 'product',
      targetId: 'cat-costa',
      targetOwnerStoreId: 'store-nordic',
      reporterStoreId: 'store-moderno',
      reason: 'wrong_data',
      comment:
        'Le misure indicate non corrispondono alla scheda tecnica del produttore: il piano è 220x100, non 200x100.',
      status: 'open',
      resolutionNote: '',
      createdAt: iso(3),
      updatedAt: iso(3),
    },
    {
      id: 'rep-2',
      targetType: 'image',
      targetId: 'img-cat-tulip-2',
      targetOwnerStoreId: 'store-comfort',
      reporterStoreId: 'store-moderno',
      reason: 'copyright',
      comment: 'Questa fotografia è stata scattata nel nostro showroom, non risulta alcun permesso attivo.',
      status: 'in_review',
      resolutionNote: 'Verifica in corso con il negozio.',
      createdAt: iso(9),
      updatedAt: iso(4),
    },
    {
      id: 'rep-3',
      targetType: 'listing',
      targetId: 'store-nordic#cat-tolomeo',
      targetOwnerStoreId: 'store-nordic',
      reporterStoreId: 'store-artigiana',
      reason: 'misleading',
      comment: 'Il servizio di consegna dichiara 24h ma la zona indicata non è coperta.',
      status: 'resolved',
      resolutionNote: 'Il negozio ha corretto i tempi di consegna.',
      createdAt: iso(30),
      updatedAt: iso(21),
    },
  ]


  // ---- Ordini gia' arrivati -------------------------------------------------
  // In demo non c'e' il sito pubblico che li scrive: qualcuno pronto serve a
  // provare la pagina "Ordini ricevuti" senza dover fare un acquisto vero.
  const fulfilments = FULFILMENT_PLAN.map(([storeId, productId, customer, city, qty, days, status], i) => {
    const product = PRODUCTS.find((p) => p.id === productId)
    const listing = listings.find((l) => l.storeId === storeId && l.productId === productId)
    const unitPrice = listing ? priceOfListing(listing) : 1200
    const store = stores.find((st) => st.id === storeId)
    const deliveryDate = new Date(now + days * 86400000).toISOString().slice(0, 10)
    return {
      id: `ful-${i + 1}`,
      orderId: `order-demo-${i + 1}`,
      reference: `AA-2609${String(10 + i).padStart(2, '0')}-${String(1000 + i * 137).slice(0, 4)}`,
      storeId,
      storeName: store ? store.name : '',
      customerId: `user-demo-${i + 1}`,
      customerName: customer,
      customerEmail: `${slugify(customer)}@example.it`,
      customerPhone: '+39 333 000 00' + (10 + i),
      shipping: {
        name: customer,
        email: `${slugify(customer)}@example.it`,
        phone: '+39 333 000 00' + (10 + i),
        address: 'Via Esempio ' + (10 + i * 3),
        city,
        postalCode: '00' + (100 + i),
        province: '',
        country: 'IT',
        notes: i % 3 === 0 ? 'Terzo piano senza ascensore' : '',
      },
      delivery: i % 2 === 0 ? 'premium' : 'standard',
      lines: [
        {
          itemId: `line-${i + 1}`,
          productId,
          name: product ? `${product.brand} ${product.name}` : 'Articolo',
          image: '',
          category: product ? product.category : '',
          brandName: product ? product.brand : null,
          storeId,
          storeName: store ? store.name : '',
          configuration: { quantity: qty },
          unitPrice,
          quantity: qty,
          lineTotal: unitPrice * qty,
        },
      ],
      subtotal: unitPrice * qty,
      shippingCost: i % 2 === 0 ? 149 : 49,
      total: unitPrice * qty + (i % 2 === 0 ? 149 : 49),
      currency: 'EUR',
      status,
      requestedDate: deliveryDate,
      confirmedDate: status === 'accepted' ? deliveryDate : null,
      proposedDate: null,
      sellerNote: '',
      requestedServices: i % 2 === 0 ? ['montaggio'] : [],
      createdAt: iso(6 - i),
      updatedAt: iso(6 - i),
      respondedAt: status === 'pending' ? null : iso(5 - i),
    }
  })

  // Un thread + il primo messaggio di servizio per ogni consegna demo, cosi'
  // "Ordini ricevuti" e la chat raccontano la stessa storia fin dal primo avvio
  // — esattamente cio' che la Lambda `orders` scriverebbe alla cattura del
  // pagamento.
  const chatThreads = []
  const chatMessages = []
  fulfilments.forEach((f, i) => {
    const createdAt = f.createdAt
    chatThreads.push({
      id: f.id,
      orderId: f.orderId,
      reference: f.reference,
      fulfilmentId: f.id,
      storeId: f.storeId,
      storeName: f.storeName,
      customerId: f.customerId,
      customerName: f.customerName,
      lastMessage: `Nuovo ordine ${f.reference}: ${f.lines.length} articolo da consegnare entro il ${f.requestedDate}.`,
      lastMessageAt: createdAt,
      customerUnread: 0,
      storeUnread: f.status === 'pending' ? 1 : 0,
      createdAt,
      updatedAt: f.updatedAt,
    })
    chatMessages.push({
      threadId: f.id,
      at: `${createdAt}#000000`,
      id: `msg-${i + 1}-0`,
      from: 'system',
      authorName: '',
      text: chatThreads[chatThreads.length - 1].lastMessage,
      kind: 'service',
      createdAt,
    })
    if (f.status === 'accepted') {
      chatMessages.push({
        threadId: f.id,
        at: `${f.respondedAt}#000000`,
        id: `msg-${i + 1}-1`,
        from: 'system',
        authorName: '',
        text: `${f.storeName} ha confermato la consegna per il ${f.confirmedDate}.`,
        kind: 'service',
        createdAt: f.respondedAt,
      })
      chatThreads[chatThreads.length - 1].lastMessage = chatMessages[chatMessages.length - 1].text
      chatThreads[chatThreads.length - 1].lastMessageAt = f.respondedAt
    }
  })

  return {
    version: 1,
    stores,
    products,
    images,
    listings,
    permissions,
    reports,
    fulfilments,
    chatThreads,
    chatMessages,
  }
}

function servicePrice(type) {
  return { montaggio: 180, consegna: 2.5, rilievo_misure: 120, ritiro_usato: 90, garanzia_estesa: 5 }[type] || 0
}

function buildCharacteristics(productId) {
  const byProduct = {
    'cat-tulip': {
      materials: [
        { name: 'Tessuto sfoderabile', finish: 'Naturale', surcharge: 0 },
        { name: 'Velluto', finish: 'Opaco', surcharge: 450 },
        { name: 'Pelle fiore', finish: 'Naturale', surcharge: 1200 },
      ],
      customizations: [
        { name: 'Colore rivestimento', type: 'choice', options: ['Écru', 'Sabbia', 'Verde salvia', 'Antracite'], price: 0, required: true },
        { name: 'Penisola', type: 'boolean', options: [], price: 780, required: false },
        { name: 'Larghezza su misura', type: 'size', options: [], price: 320, required: false },
      ],
    },
    'cat-ripiego': {
      materials: [
        { name: 'Rovere massello', finish: 'Naturale', surcharge: 0 },
        { name: 'Noce Canaletto', finish: 'Sbiancato', surcharge: 600 },
      ],
      customizations: [
        { name: 'Finitura piano', type: 'choice', options: ['Olio naturale', 'Vernice opaca'], price: 0, required: true },
        { name: 'Incisione sul bordo', type: 'text', options: [], price: 90, required: false },
      ],
    },
    'cat-nathalie': {
      materials: [
        { name: 'Tessuto sfoderabile', finish: 'Naturale', surcharge: 0 },
        { name: 'Pelle rigenerata', finish: 'Opaco', surcharge: 890 },
      ],
      customizations: [
        { name: 'Rete', type: 'choice', options: ['Fissa', 'Contenitore'], price: 340, required: true },
        { name: 'Altezza piedini', type: 'size', options: [], price: 0, required: false },
      ],
    },
  }
  return (
    byProduct[productId] || {
      materials: [{ name: 'Standard di produzione', finish: 'Naturale', surcharge: 0 }],
      customizations: [],
    }
  )
}

function buildPricing(productId, model) {
  const seed = PRICE_SEED[productId] || { flat: 1000 }
  const pricing = emptyPricing(model)
  if (model === 'flat') {
    pricing.rows = [{ id: 'r1', label: 'Prezzo di listino', price: seed.flat }]
  } else if (model === 'qty-tiers') {
    const t = seed.tiers || [seed.flat, seed.flat, seed.flat]
    pricing.rows = [
      { id: 'r1', from: 1, to: 2, price: t[0] },
      { id: 'r2', from: 3, to: 5, price: t[1] },
      { id: 'r3', from: 6, to: 999, price: t[2] },
    ]
  } else if (model === 'size-grid' && seed.grid?.length) {
    pricing.rows = seed.grid.map(([width, depth, price], i) => ({ id: `r${i + 1}`, width, depth, price }))
  } else if (model === 'variant-matrix' && seed.matrix?.length) {
    pricing.rows = seed.matrix.map(([material, finish, price], i) => ({ id: `r${i + 1}`, material, finish, price }))
  } else if (model === 'custom') {
    pricing.columns = [
      { key: 'col1', label: 'Composizione', type: 'text' },
      { key: 'col2', label: 'Metri lineari', type: 'number' },
      { key: 'price', label: 'Prezzo', type: 'price' },
    ]
    pricing.rows = [
      { id: 'r1', col1: 'Base lineare', col2: 3.6, price: seed.flat },
      { id: 'r2', col1: 'Con isola', col2: 4.8, price: Math.round(seed.flat * 1.35) },
    ]
    pricing.notes = 'Prezzi indicativi, la configurazione definitiva esce dal progetto esecutivo.'
  } else {
    pricing.rows = [{ id: 'r1', label: 'Prezzo di listino', price: seed.flat }]
    pricing.columns = [
      { key: 'label', label: 'Voce', type: 'text' },
      { key: 'price', label: 'Prezzo', type: 'price' },
    ]
    pricing.model = 'flat'
  }
  return pricing
}
