// ---------------------------------------------------------------------------
// Modello di dominio del gestionale.
//
// Il catalogo è GLOBALE: un prodotto (es. "Divano Tulip — Moroso") esiste una
// sola volta sulla piattaforma, creato dal primo negozio che lo inserisce. Ogni
// altro negozio non lo ricrea, ci "aggancia" una PROPOSTA (listing) con le sue
// disponibilità, le sue foto, le sue caratteristiche, il suo listino e i suoi
// servizi. Così il compratore vede una sola scheda prodotto con N venditori.
//
//   CatalogProduct  1 ── N  Listing        (una per negozio)
//   CatalogProduct  1 ── N  ProductImage   (di proprietà del negozio che l'ha caricata)
//   Listing         N ── N  ProductImage   (per riferimento, con ruolo copertina/galleria)
// ---------------------------------------------------------------------------

/** @typedef {'stock'|'reseller'} AvailabilityMode */
/** @typedef {'cover'|'gallery'} ImageRole */
/** @typedef {'draft'|'published'|'paused'} ListingStatus */

// ---- Categorie merceologiche (allineate al catalogo pubblico) --------------
export const CATEGORIES = [
  'Divani',
  'Poltrone',
  'Letti',
  'Tavoli',
  'Sedie',
  'Cucine',
  'Armadi',
  'Librerie',
  'Illuminazione',
  'Complementi',
  'Outdoor',
]

// ---- Materiali suggeriti ---------------------------------------------------
export const MATERIALS = [
  'Rovere massello',
  'Rovere impiallacciato',
  'Noce Canaletto',
  'Frassino',
  'Laccato opaco',
  'Laccato lucido',
  'Marmo Carrara',
  'Marmo Marquina',
  'Gres porcellanato',
  'Cristallo temperato',
  'Acciaio inox',
  'Ottone brunito',
  'Alluminio anodizzato',
  'Pelle fiore',
  'Pelle rigenerata',
  'Tessuto sfoderabile',
  'Velluto',
  'Bouclé',
  'Rattan',
  'Corda nautica',
]

export const FINISHES = [
  'Naturale',
  'Sbiancato',
  'Tinto wengè',
  'Opaco',
  'Lucido',
  'Spazzolato',
  'Brunito',
  'Cromato',
]

// ---- Tipi di personalizzazione che un negozio può offrire ------------------
export const CUSTOMIZATION_TYPES = [
  { value: 'choice', label: 'Scelta tra opzioni', hint: 'Es. colore, finitura, verso di apertura' },
  { value: 'size', label: 'Dimensione su misura', hint: 'Il cliente indica una misura in cm' },
  { value: 'text', label: 'Testo libero', hint: 'Es. incisione, monogramma' },
  { value: 'boolean', label: 'Opzione sì / no', hint: 'Es. piedini regolabili' },
]

// ---- Modelli di listino ----------------------------------------------------
// Tutti i modelli producono la stessa struttura { columns, rows }: cambia solo
// il preset di colonne. "custom" parte da zero e lascia definire le colonne.
export const PRICE_TEMPLATES = [
  {
    id: 'flat',
    label: 'Prezzo unico',
    description: 'Un solo prezzo di listino, eventualmente con sconto a volume.',
    columns: [
      { key: 'label', label: 'Voce', type: 'text' },
      { key: 'price', label: 'Prezzo', type: 'price' },
    ],
    rows: [{ label: 'Prezzo di listino', price: 0 }],
  },
  {
    id: 'qty-tiers',
    label: 'Fasce di quantità',
    description: 'Prezzo unitario decrescente al crescere dei pezzi ordinati.',
    columns: [
      { key: 'from', label: 'Da (pz)', type: 'number' },
      { key: 'to', label: 'A (pz)', type: 'number' },
      { key: 'price', label: 'Prezzo unitario', type: 'price' },
    ],
    rows: [
      { from: 1, to: 2, price: 0 },
      { from: 3, to: 5, price: 0 },
      { from: 6, to: 999, price: 0 },
    ],
  },
  {
    id: 'size-grid',
    label: 'Griglia dimensioni',
    description: 'Prezzo per combinazione larghezza × profondità.',
    columns: [
      { key: 'width', label: 'Larghezza (cm)', type: 'number' },
      { key: 'depth', label: 'Profondità (cm)', type: 'number' },
      { key: 'price', label: 'Prezzo', type: 'price' },
    ],
    rows: [
      { width: 160, depth: 90, price: 0 },
      { width: 200, depth: 90, price: 0 },
      { width: 240, depth: 100, price: 0 },
    ],
  },
  {
    id: 'variant-matrix',
    label: 'Per materiale e finitura',
    description: 'Un prezzo per ogni combinazione di materiale/finitura offerta.',
    columns: [
      { key: 'material', label: 'Materiale', type: 'text' },
      { key: 'finish', label: 'Finitura', type: 'text' },
      { key: 'price', label: 'Prezzo', type: 'price' },
    ],
    rows: [{ material: '', finish: '', price: 0 }],
  },
  {
    id: 'custom',
    label: 'Da zero',
    description: 'Definisci tu colonne e righe del listino.',
    columns: [
      { key: 'col1', label: 'Descrizione', type: 'text' },
      { key: 'price', label: 'Prezzo', type: 'price' },
    ],
    rows: [{ col1: '', price: 0 }],
  },
]

export const COLUMN_TYPES = [
  { value: 'text', label: 'Testo' },
  { value: 'number', label: 'Numero' },
  { value: 'price', label: 'Prezzo (EUR)' },
]

// ---- Servizi accessori vendibili insieme al prodotto -----------------------
export const SERVICE_CATALOG = [
  {
    type: 'montaggio',
    label: 'Montaggio',
    description: 'Assemblaggio e messa in opera da parte dei montatori del negozio.',
    defaultPriceMode: 'fixed',
  },
  {
    type: 'consegna',
    label: 'Consegna al piano',
    description: "Trasporto fino all'abitazione, con eventuale supplemento piani.",
    defaultPriceMode: 'per_unit',
    defaultUnit: 'km',
  },
  {
    type: 'rilievo_misure',
    label: 'Rilievo misure e progettazione',
    description: 'Sopralluogo con rilievo e restituzione del progetto esecutivo.',
    defaultPriceMode: 'fixed',
  },
  {
    type: 'ritiro_usato',
    label: 'Ritiro e smaltimento usato',
    description: 'Ritiro del mobile sostituito e conferimento a norma.',
    defaultPriceMode: 'fixed',
  },
  {
    type: 'garanzia_estesa',
    label: 'Garanzia estesa',
    description: 'Estensione della copertura oltre i 24 mesi di legge.',
    defaultPriceMode: 'percent',
  },
]

export const PRICE_MODES = [
  { value: 'fixed', label: 'Prezzo fisso', hint: "Importo unico indipendente dall'ordine" },
  { value: 'percent', label: '% sul prodotto', hint: 'Calcolato sul totale del prodotto' },
  { value: 'per_unit', label: 'A unità', hint: 'Es. al km, al piano, al m²' },
  { value: 'quote', label: 'Su preventivo', hint: 'Definito caso per caso dal negozio' },
  { value: 'free', label: 'Incluso', hint: 'Compreso nel prezzo del prodotto' },
]

// ---- Permessi sui contenuti ------------------------------------------------
// Un negozio può concedere a un altro negozio l'uso dei propri contenuti su un
// prodotto del catalogo. Senza permesso esplicito i contenuti non generici non
// sono riutilizzabili.
export const PERMISSION_SCOPES = [
  { value: 'images', label: 'Fotografie', description: 'Riutilizzo delle foto caricate dal negozio' },
  { value: 'description', label: 'Descrizione e schede', description: 'Testi descrittivi e caratteristiche' },
  { value: 'price_table', label: 'Struttura del listino', description: 'Colonne e righe del listino, non i prezzi' },
  { value: 'services', label: 'Configurazione servizi', description: 'Set di servizi accessori già configurato' },
]

export const PERMISSION_STATUSES = {
  pending: { label: 'In attesa', color: 'warning' },
  granted: { label: 'Concesso', color: 'success' },
  denied: { label: 'Rifiutato', color: 'error' },
  revoked: { label: 'Revocato', color: 'default' },
}

// ---- Segnalazioni di contenuto --------------------------------------------
export const REPORT_REASONS = [
  { value: 'wrong_data', label: 'Dati errati o incompleti' },
  { value: 'duplicate', label: 'Prodotto duplicato in catalogo' },
  { value: 'copyright', label: 'Foto o testi non di proprietà del negozio' },
  { value: 'misleading', label: 'Contenuto ingannevole' },
  { value: 'inappropriate', label: 'Contenuto inappropriato' },
  { value: 'other', label: 'Altro' },
]

export const REPORT_TARGETS = {
  product: 'Prodotto di catalogo',
  image: 'Fotografia',
  listing: 'Proposta di vendita',
  store: 'Negozio',
}

export const REPORT_STATUSES = {
  open: { label: 'Aperta', color: 'warning' },
  in_review: { label: 'In esame', color: 'info' },
  resolved: { label: 'Risolta', color: 'success' },
  rejected: { label: 'Respinta', color: 'default' },
}

// ---- Factory ---------------------------------------------------------------

export function emptyAvailability() {
  return {
    mode: 'stock',
    stockQty: 0,
    lowStockThreshold: 2,
    resellerFrom: new Date().toISOString().slice(0, 10),
    resellerTo: '',
    leadTimeDays: 21,
    note: '',
  }
}

export function emptyPricing(templateId = 'flat') {
  const tpl = PRICE_TEMPLATES.find((t) => t.id === templateId) || PRICE_TEMPLATES[0]
  return {
    model: tpl.id,
    currency: 'EUR',
    vatIncluded: true,
    unit: 'pz',
    columns: tpl.columns.map((c) => ({ ...c })),
    rows: tpl.rows.map((r, i) => ({ id: `r${i + 1}`, ...r })),
    notes: '',
  }
}

export function emptyServices() {
  return SERVICE_CATALOG.map((s) => ({
    type: s.type,
    enabled: false,
    priceMode: s.defaultPriceMode,
    price: 0,
    unit: s.defaultUnit || '',
    leadTimeDays: 7,
    notes: '',
  }))
}

export function emptyListing(storeId, productId) {
  return {
    storeId,
    productId,
    status: 'draft',
    sku: '',
    availability: emptyAvailability(),
    images: [],
    characteristics: { materials: [], customizations: [] },
    pricing: emptyPricing('flat'),
    services: emptyServices(),
  }
}

// ---- Helper ----------------------------------------------------------------

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Chiave di unicità del catalogo: due negozi non possono creare lo stesso prodotto. */
export function catalogKey({ brand, name }) {
  return slugify(`${brand || 'senza-marchio'} ${name || ''}`)
}

export function formatPrice(value, currency = 'EUR') {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Giorni che mancano alla scadenza del periodo da rivenditore (null se assente). */
export function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

/** Riassume la disponibilità di una proposta in etichetta + colore. */
export function availabilityLabel(availability) {
  if (!availability) return { label: 'Non definita', color: 'default' }
  if (availability.mode === 'reseller') {
    const left = daysLeft(availability.resellerTo)
    if (availability.resellerTo && left !== null && left < 0)
      return { label: 'Accordo scaduto', color: 'error' }
    if (left !== null && left <= 30)
      return { label: `Rivenditore · scade tra ${left} gg`, color: 'warning' }
    return { label: 'Rivenditore · disponibilità illimitata', color: 'success' }
  }
  const qty = Number(availability.stockQty) || 0
  if (qty <= 0) return { label: 'Esaurito', color: 'error' }
  if (qty <= (Number(availability.lowStockThreshold) || 0))
    return { label: `Scorta bassa · ${qty} pz`, color: 'warning' }
  return { label: `${qty} pz disponibili`, color: 'success' }
}

/** Prezzo minimo ricavato dal listino, usato nelle card di riepilogo. */
export function priceFrom(pricing) {
  if (!pricing || !Array.isArray(pricing.rows)) return null
  const priceCols = (pricing.columns || []).filter((c) => c.type === 'price').map((c) => c.key)
  const values = pricing.rows
    .flatMap((row) => priceCols.map((k) => Number(row[k])))
    .filter((n) => Number.isFinite(n) && n > 0)
  return values.length ? Math.min(...values) : null
}

// ---------------------------------------------------------------------------
// Capacità del venditore: cosa sa fare, dove arriva, quando consegna.
//
// Sono dati del NEGOZIO, non della singola proposta: il sito pubblico li usa
// per capire quali venditori può proporre a un compratore e in che date. I
// servizi per singola proposta (SERVICE_CATALOG più sopra) restano il dettaglio
// commerciale di quel prodotto; questi sono la promessa di base del negozio.
//
// Gemello di FE/src/lib/seller.ts — stessi `type`, perché finiscono nello stesso
// documento negozio letto dalle due applicazioni.
// ---------------------------------------------------------------------------

export const SELLER_SERVICES = [
  {
    type: 'trasporto',
    label: 'Trasporto',
    description: 'Consegna della merce con mezzi propri o corriere convenzionato.',
    logistic: true,
  },
  {
    type: 'montaggio',
    label: 'Montaggio',
    description: 'Assemblaggio e messa in opera da parte dei montatori del negozio.',
    logistic: true,
  },
  {
    type: 'consegna_al_piano',
    label: 'Consegna al piano',
    description: "Trasporto fino all'abitazione, anche senza ascensore.",
    logistic: true,
  },
  {
    type: 'rilievo_misure',
    label: 'Rilievo misure e progettazione',
    description: 'Sopralluogo con rilievo e restituzione del progetto esecutivo.',
    logistic: false,
  },
  {
    type: 'ritiro_usato',
    label: 'Ritiro e smaltimento usato',
    description: "Ritiro del mobile sostituito e conferimento a norma.",
    logistic: false,
  },
  {
    type: 'garanzia_estesa',
    label: 'Garanzia estesa',
    description: 'Estensione della copertura oltre i 24 mesi di legge.',
    logistic: false,
  },
]

export const SELLER_SERVICE_BY_TYPE = Object.fromEntries(
  SELLER_SERVICES.map((s) => [s.type, s]),
)

// Giorni della settimana come li numera Date.getDay(): 0 = domenica.
export const WEEKDAYS = [
  { value: 1, label: 'Lunedì', short: 'Lun' },
  { value: 2, label: 'Martedì', short: 'Mar' },
  { value: 3, label: 'Mercoledì', short: 'Mer' },
  { value: 4, label: 'Giovedì', short: 'Gio' },
  { value: 5, label: 'Venerdì', short: 'Ven' },
  { value: 6, label: 'Sabato', short: 'Sab' },
  { value: 0, label: 'Domenica', short: 'Dom' },
]

export function emptySellerServices() {
  return SELLER_SERVICES.map((s) => ({
    type: s.type,
    enabled: false,
    priceMode: 'quote',
    price: 0,
    unit: '',
    leadTimeDays: 0,
    notes: '',
  }))
}

/** Calendario prudente di partenza: lun–ven, tre settimane di preavviso. */
export function emptySellerDelivery() {
  return {
    weekdays: [1, 2, 3, 4, 5],
    leadTimeDays: 21,
    slotsPerDay: 3,
    horizonDays: 120,
    blackoutDates: [],
    note: '',
  }
}

/** Unisce i servizi salvati al catalogo, così un tipo nuovo compare da solo. */
export function sellerServicesOf(store) {
  const saved = Array.isArray(store?.services) ? store.services : []
  return SELLER_SERVICES.map((def) => {
    const found = saved.find((s) => s.type === def.type)
    return found
      ? { ...found, type: def.type }
      : { type: def.type, enabled: false, priceMode: 'quote', price: 0, unit: '', leadTimeDays: 0, notes: '' }
  })
}

export function sellerDeliveryOf(store) {
  const d = store?.delivery
  if (!d) return emptySellerDelivery()
  const base = emptySellerDelivery()
  return {
    // Un elenco vuoto ma presente significa "chiuso": si rispetta.
    weekdays: Array.isArray(d.weekdays) ? d.weekdays : base.weekdays,
    leadTimeDays: Number.isFinite(Number(d.leadTimeDays)) ? Number(d.leadTimeDays) : base.leadTimeDays,
    slotsPerDay: Number(d.slotsPerDay) || base.slotsPerDay,
    horizonDays: Number(d.horizonDays) || base.horizonDays,
    blackoutDates: Array.isArray(d.blackoutDates) ? d.blackoutDates : [],
    note: typeof d.note === 'string' ? d.note : '',
  }
}

/** Prima data consegnabile, per l'anteprima nel profilo del negozio. */
export function firstDeliverableDate(delivery, from = new Date()) {
  const rules = sellerDeliveryOf({ delivery })
  if (!rules.weekdays.length) return null
  const cursor = new Date(from)
  cursor.setHours(12, 0, 0, 0)
  cursor.setDate(cursor.getDate() + Math.max(0, rules.leadTimeDays))
  for (let i = 0; i <= rules.horizonDays; i += 1) {
    const iso = cursor.toISOString().slice(0, 10)
    if (rules.weekdays.includes(cursor.getDay()) && !rules.blackoutDates.includes(iso)) return iso
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}

/** E' una data che il negozio consegna davvero, secondo il suo calendario? */
export function sellerAcceptsDate(delivery, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return false
  const rules = sellerDeliveryOf({ delivery })
  if (!rules.weekdays.length) return false
  const day = new Date(date + 'T12:00:00')
  if (Number.isNaN(day.getTime())) return false
  if (!rules.weekdays.includes(day.getDay())) return false
  if (rules.blackoutDates.includes(date)) return false
  const earliest = firstDeliverableDate(delivery)
  return !earliest || date >= earliest
}

// ---- Ordini ricevuti -------------------------------------------------------
// Ogni ordine pagato sul sito pubblico si divide in una consegna per negozio.
// Il venditore vede solo la propria.

export const FULFILMENT_STATUSES = {
  pending: { label: 'Da confermare', color: 'warning' },
  accepted: { label: 'Confermato', color: 'success' },
  rescheduled: { label: 'Data riproposta', color: 'info' },
  rejected: { label: 'Rifiutato', color: 'error' },
  delivered: { label: 'Consegnato', color: 'default' },
  cancelled: { label: 'Annullato', color: 'default' },
}
