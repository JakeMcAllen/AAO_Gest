'use strict'

// Proposte di vendita — /listings
//
//   GET    /listings?storeId              le proposte di un negozio (con la scheda)
//   GET    /listings?productId            i venditori di un prodotto (con il negozio)
//   GET    /listings/{storeId}/{productId}
//   POST   /listings                      aggancia un negozio a un prodotto esistente
//   PUT    /listings/{storeId}/{productId}
//   DELETE /listings/{storeId}/{productId}

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const {
  DynamoDBDocumentClient,
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client({})
const LISTINGS = process.env.TABLE_LISTINGS
const CATALOG = process.env.TABLE_CATALOG
const IMAGES = process.env.TABLE_IMAGES
const STORES = process.env.TABLE_STORES
const BUCKET = process.env.BUCKET_MEDIA
const TTL = Number(process.env.MEDIA_URL_TTL || 3600)
const PRODUCT_INDEX = 'productId-index'

const signGet = (Key) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key }), { expiresIn: TTL })

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

/** Legge in blocco gli item indicati, saltando i duplicati. */
async function batchGet(table, keys) {
  const unique = []
  const seen = new Set()
  keys.forEach((k) => {
    const sig = JSON.stringify(k)
    if (!seen.has(sig)) {
      seen.add(sig)
      unique.push(k)
    }
  })
  const out = []
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100)
    // eslint-disable-next-line no-await-in-loop
    const res = await doc.send(new BatchGetCommand({ RequestItems: { [table]: { Keys: chunk } } }))
    out.push(...((res.Responses || {})[table] || []))
  }
  return out
}

function emptyListing(storeId, productId) {
  const now = new Date().toISOString()
  return {
    storeId,
    productId,
    status: 'draft',
    sku: '',
    availability: {
      mode: 'stock',
      stockQty: 0,
      lowStockThreshold: 2,
      resellerFrom: now.slice(0, 10),
      resellerTo: '',
      leadTimeDays: 21,
      note: '',
    },
    images: [],
    characteristics: { materials: [], customizations: [] },
    pricing: {
      model: 'flat',
      currency: 'EUR',
      vatIncluded: true,
      unit: 'pz',
      columns: [
        { key: 'label', label: 'Voce', type: 'text' },
        { key: 'price', label: 'Prezzo', type: 'price' },
      ],
      rows: [{ id: 'r1', label: 'Prezzo di listino', price: 0 }],
      notes: '',
    },
    services: [],
    createdAt: now,
    updatedAt: now,
  }
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
    if (seg.length === 1) {
      if (method === 'GET') {
        // Proposte di un negozio: si allega la scheda di catalogo e la copertina.
        if (q.storeId) {
          const res = await doc.send(
            new QueryCommand({
              TableName: LISTINGS,
              KeyConditionExpression: 'storeId = :s',
              ExpressionAttributeValues: { ':s': q.storeId },
            }),
          )
          const listings = res.Items || []
          const products = await batchGet(
            CATALOG,
            listings.map((l) => ({ id: l.productId })),
          )
          const byProduct = Object.fromEntries(products.map((p) => [p.id, p]))

          const coverIds = listings
            .map((l) => (l.images || []).find((i) => i.role === 'cover') || (l.images || [])[0])
            .filter(Boolean)
            .map((ref) => ({ imageId: ref.imageId }))
          const images = coverIds.length ? await batchGet(IMAGES, coverIds) : []
          const byImage = Object.fromEntries(images.map((i) => [i.imageId, i]))

          const withCovers = await Promise.all(
            listings.map(async (l) => {
              const ref = (l.images || []).find((i) => i.role === 'cover') || (l.images || [])[0]
              const image = ref ? byImage[ref.imageId] : null
              return {
                ...l,
                product: byProduct[l.productId] || null,
                coverUrl: image ? await signGet(image.coverKey) : null,
              }
            }),
          )
          return json(200, withCovers)
        }

        // Venditori di un prodotto.
        if (q.productId) {
          const res = await doc.send(
            new QueryCommand({
              TableName: LISTINGS,
              IndexName: PRODUCT_INDEX,
              KeyConditionExpression: 'productId = :p',
              ExpressionAttributeValues: { ':p': q.productId },
            }),
          )
          const listings = res.Items || []
          const stores = await batchGet(
            STORES,
            listings.map((l) => ({ id: l.storeId })),
          )
          const byStore = Object.fromEntries(stores.map((s) => [s.id, s]))
          return json(
            200,
            listings.map((l) => ({ ...l, store: byStore[l.storeId] || null })),
          )
        }

        return json(400, { message: 'Indicare storeId oppure productId' })
      }

      if (method === 'POST') {
        const { storeId, productId } = body
        if (!storeId || !productId) return json(400, { message: 'storeId e productId obbligatori' })

        const product = await doc.send(new GetCommand({ TableName: CATALOG, Key: { id: productId } }))
        if (!product.Item) return json(404, { message: 'Prodotto non presente in catalogo' })

        const existing = await doc.send(
          new GetCommand({ TableName: LISTINGS, Key: { storeId, productId } }),
        )
        if (existing.Item) {
          return json(409, { message: 'Hai già una proposta per questo prodotto', listing: existing.Item })
        }

        const listing = emptyListing(storeId, productId)
        await doc.send(new PutCommand({ TableName: LISTINGS, Item: listing }))
        return json(201, listing)
      }
    }

    // ---- /listings/{storeId}/{productId} ----
    if (seg.length === 3) {
      const storeId = decodeURIComponent(seg[1])
      const productId = decodeURIComponent(seg[2])

      if (method === 'GET') {
        const res = await doc.send(new GetCommand({ TableName: LISTINGS, Key: { storeId, productId } }))
        return json(200, res.Item || null)
      }

      if (method === 'PUT') {
        const existing = await doc.send(
          new GetCommand({ TableName: LISTINGS, Key: { storeId, productId } }),
        )
        const listing = {
          ...(existing.Item || emptyListing(storeId, productId)),
          ...body,
          storeId,
          productId,
          updatedAt: new Date().toISOString(),
        }
        await doc.send(new PutCommand({ TableName: LISTINGS, Item: listing }))
        return json(200, listing)
      }

      if (method === 'DELETE') {
        await doc.send(new DeleteCommand({ TableName: LISTINGS, Key: { storeId, productId } }))
        return json(200, { storeId, productId })
      }
    }

    return json(405, { message: 'Metodo non supportato' })
  } catch (err) {
    console.error(err)
    return json(500, { message: 'Errore interno', detail: err.message })
  }
}
