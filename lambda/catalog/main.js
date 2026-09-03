'use strict'

// Catalogo globale dei prodotti — /catalog
//
//   GET    /catalog                      elenco (query: q, category, brand)
//   GET    /catalog/duplicate?brand&name verifica di unicità
//   GET    /catalog/{id}                 scheda singola
//   POST   /catalog                      crea (rifiuta i duplicati)
//   PUT    /catalog/{id}                 modifica (solo il negozio creatore)
//
// Unicità: la scheda viene scritta in transazione insieme a un item guardia
// "KEY#<catalogKey>". Se la guardia esiste già la transazione fallisce, quindi
// due negozi non possono inserire lo stesso prodotto nemmeno in parallelo.

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} = require('@aws-sdk/lib-dynamodb')
const crypto = require('crypto')

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const CATALOG = process.env.TABLE_CATALOG
const LISTINGS = process.env.TABLE_LISTINGS
const IMAGES = process.env.TABLE_IMAGES
const KEY_INDEX = 'catalogKey-index'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    body: body === undefined ? '' : JSON.stringify(body),
  }
}

function segments(event) {
  return (event.rawPath || '').replace(/^\/+|\/+$/g, '').split('/')
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function catalogKey({ brand, name }) {
  return slugify(`${brand || 'senza-marchio'} ${name || ''}`)
}

async function findByKey(key) {
  const res = await doc.send(
    new QueryCommand({
      TableName: CATALOG,
      IndexName: KEY_INDEX,
      KeyConditionExpression: 'catalogKey = :k',
      ExpressionAttributeValues: { ':k': key },
      Limit: 1,
    }),
  )
  return (res.Items || [])[0] || null
}

/** Conteggi mostrati nelle card del catalogo. */
async function decorate(products) {
  const [listings, images] = await Promise.all([
    doc.send(new ScanCommand({ TableName: LISTINGS, ProjectionExpression: 'productId, #s', ExpressionAttributeNames: { '#s': 'status' } })),
    doc.send(new ScanCommand({ TableName: IMAGES, ProjectionExpression: 'productId' })),
  ])
  const sellers = {}
  ;(listings.Items || [])
    .filter((l) => l.status !== 'draft')
    .forEach((l) => {
      sellers[l.productId] = (sellers[l.productId] || 0) + 1
    })
  const photos = {}
  ;(images.Items || []).forEach((i) => {
    photos[i.productId] = (photos[i.productId] || 0) + 1
  })
  return products.map((p) => ({
    ...p,
    sellersCount: sellers[p.id] || 0,
    imagesCount: photos[p.id] || 0,
  }))
}

exports.handler = async (event) => {
  const method = event.requestContext.http.method
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }
  }

  const seg = segments(event)
  const q = event.queryStringParameters || {}
  let body = {}
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch {
    return json(400, { message: 'Corpo della richiesta non valido' })
  }

  try {
    // ---- /catalog/duplicate ----
    if (seg.length === 2 && seg[1] === 'duplicate' && method === 'GET') {
      const key = catalogKey({ brand: q.brand, name: q.name })
      if (!key) return json(200, null)
      const exact = await findByKey(key)
      if (exact) return json(200, { match: 'exact', product: exact })

      const needle = String(q.name || '').trim().toLowerCase()
      if (needle.length < 4) return json(200, null)
      const all = await doc.send(new ScanCommand({ TableName: CATALOG }))
      const similar = (all.Items || [])
        .filter((p) => p.id && !String(p.id).startsWith('KEY#'))
        .find(
          (p) =>
            p.name.toLowerCase().includes(needle) || needle.includes(p.name.toLowerCase()),
        )
      return json(200, similar ? { match: 'similar', product: similar } : null)
    }

    // ---- collezione ----
    if (seg.length === 1) {
      if (method === 'GET') {
        const res = await doc.send(new ScanCommand({ TableName: CATALOG }))
        let items = (res.Items || []).filter((p) => !String(p.id).startsWith('KEY#'))
        if (q.category) items = items.filter((p) => p.category === q.category)
        if (q.brand) items = items.filter((p) => p.brand === q.brand)
        if (q.q) {
          const needle = q.q.toLowerCase()
          items = items.filter(
            (p) =>
              p.name.toLowerCase().includes(needle) ||
              p.brand.toLowerCase().includes(needle) ||
              p.category.toLowerCase().includes(needle),
          )
        }
        return json(200, await decorate(items))
      }

      if (method === 'POST') {
        if (!body.name || !body.brand || !body.category) {
          return json(400, { message: 'Marchio, nome e categoria sono obbligatori' })
        }
        const key = catalogKey(body)
        const now = new Date().toISOString()
        const product = {
          id: crypto.randomUUID(),
          catalogKey: key,
          name: String(body.name).trim(),
          brand: String(body.brand).trim(),
          category: body.category,
          description: body.description || '',
          specs: body.specs || {},
          createdByStoreId: body.createdByStoreId || '',
          createdAt: now,
          updatedAt: now,
        }
        try {
          await doc.send(
            new TransactWriteCommand({
              TransactItems: [
                {
                  Put: {
                    TableName: CATALOG,
                    Item: { id: `KEY#${key}`, productId: product.id, createdAt: now },
                    ConditionExpression: 'attribute_not_exists(id)',
                  },
                },
                { Put: { TableName: CATALOG, Item: product } },
              ],
            }),
          )
        } catch (err) {
          if (err.name === 'TransactionCanceledException') {
            const existing = await findByKey(key)
            return json(409, { message: 'Questo prodotto è già in catalogo', product: existing })
          }
          throw err
        }
        return json(201, product)
      }
    }

    // ---- singolo ----
    if (seg.length === 2) {
      const id = seg[1]
      if (method === 'GET') {
        const res = await doc.send(new GetCommand({ TableName: CATALOG, Key: { id } }))
        if (!res.Item) return json(404, { message: 'Prodotto non trovato' })
        return json(200, res.Item)
      }
      if (method === 'PUT') {
        const res = await doc.send(new GetCommand({ TableName: CATALOG, Key: { id } }))
        if (!res.Item) return json(404, { message: 'Prodotto non trovato' })
        if (res.Item.createdByStoreId !== body.storeId) {
          return json(403, { message: 'Solo il negozio che ha creato la scheda può modificarla' })
        }
        // Nome e marchio restano immutabili: cambiarli sposterebbe la chiave di
        // unicità e potrebbe collidere con un'altra scheda.
        const updated = {
          ...res.Item,
          description: body.description ?? res.Item.description,
          category: body.category ?? res.Item.category,
          specs: body.specs ?? res.Item.specs,
          updatedAt: new Date().toISOString(),
        }
        await doc.send(new PutCommand({ TableName: CATALOG, Item: updated }))
        return json(200, updated)
      }
    }

    return json(405, { message: 'Metodo non supportato' })
  } catch (err) {
    console.error(err)
    return json(500, { message: 'Errore interno', detail: err.message })
  }
}
