'use strict'

// Fotografie dei prodotti — /media
//
//   GET    /media?productId&viewerStoreId   elenco con URL firmate e diritto d'uso
//   POST   /media/upload-url                riserva l'id e firma le PUT su S3
//   POST   /media                           registra il metadato dopo il caricamento
//   PUT    /media/{imageId}                 didascalia / condivisione generica
//   DELETE /media/{imageId}?storeId         rimozione logica
//
// Regola di riuso: una foto è utilizzabile da un negozio se è sua, se è marcata
// `generic` (condivisa con il catalogo) oppure se il proprietario ha concesso un
// permesso attivo con scope "images" su quel prodotto.

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb')
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const crypto = require('crypto')

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client({})

const IMAGES = process.env.TABLE_IMAGES
const PERMISSIONS = process.env.TABLE_PERMISSIONS
const STORES = process.env.TABLE_STORES
const BUCKET = process.env.BUCKET_MEDIA
const TTL = Number(process.env.MEDIA_URL_TTL || 3600)
const PRODUCT_INDEX = 'imageProductId-index'
const OWNER_INDEX = 'ownerStoreId-index'

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

const signGet = (Key) => getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key }), { expiresIn: TTL })
const signPut = (Key, ContentType) =>
  getSignedUrl(s3, new PutObjectCommand({ Bucket: BUCKET, Key, ContentType }), { expiresIn: 900 })

async function activeGrants(requesterStoreId, productId) {
  if (!requesterStoreId) return []
  const res = await doc.send(
    new QueryCommand({
      TableName: PERMISSIONS,
      IndexName: 'requesterStoreId-index',
      KeyConditionExpression: 'requesterStoreId = :r',
      ExpressionAttributeValues: { ':r': requesterStoreId },
    }),
  )
  const now = Date.now()
  return (res.Items || []).filter(
    (p) =>
      p.productId === productId &&
      p.status === 'granted' &&
      (p.scopes || []).includes('images') &&
      (!p.expiresAt || new Date(p.expiresAt).getTime() > now),
  )
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
    // ---- POST /media/upload-url ----
    if (seg.length === 2 && seg[1] === 'upload-url' && method === 'POST') {
      if (!body.productId || !body.storeId) {
        return json(400, { message: 'productId e storeId sono obbligatori' })
      }
      const imageId = crypto.randomUUID()
      const fullKey = `products/${body.productId}/${imageId}/full.webp`
      const coverKey = `products/${body.productId}/${imageId}/cover.webp`
      const [fullUrl, coverUrl] = await Promise.all([
        signPut(fullKey, body.contentType || 'image/webp'),
        signPut(coverKey, body.contentType || 'image/webp'),
      ])
      return json(200, { imageId, fullKey, coverKey, fullUrl, coverUrl })
    }

    // ---- collezione ----
    if (seg.length === 1) {
      if (method === 'GET') {
        if (!q.productId) return json(400, { message: 'productId obbligatorio' })
        const res = await doc.send(
          new QueryCommand({
            TableName: IMAGES,
            IndexName: PRODUCT_INDEX,
            KeyConditionExpression: 'productId = :p',
            ExpressionAttributeValues: { ':p': q.productId },
          }),
        )
        const images = (res.Items || []).filter((i) => i.status !== 'deleted')
        const grants = await activeGrants(q.viewerStoreId, q.productId)
        const granted = new Set(grants.map((g) => g.ownerStoreId))
        const stores = await doc.send(new ScanCommand({ TableName: STORES, ProjectionExpression: 'id, #n', ExpressionAttributeNames: { '#n': 'name' } }))
        const names = Object.fromEntries((stores.Items || []).map((s) => [s.id, s.name]))

        const decorated = await Promise.all(
          images.map(async (image) => {
            const own = image.ownerStoreId === q.viewerStoreId
            let usable = own || Boolean(image.generic)
            let usableReason = own ? 'own' : image.generic ? 'generic' : 'denied'
            if (!usable && granted.has(image.ownerStoreId)) {
              usable = true
              usableReason = 'granted'
            }
            const [fullUrl, coverUrl] = await Promise.all([
              signGet(image.fullKey),
              signGet(image.coverKey),
            ])
            return {
              ...image,
              id: image.imageId,
              fullUrl,
              coverUrl,
              usable,
              usableReason,
              ownerStoreName: names[image.ownerStoreId] || '—',
            }
          }),
        )
        return json(200, decorated)
      }

      if (method === 'POST') {
        if (!body.imageId || !body.productId || !body.storeId) {
          return json(400, { message: 'imageId, productId e storeId sono obbligatori' })
        }
        const image = {
          imageId: body.imageId,
          productId: body.productId,
          ownerStoreId: body.storeId,
          caption: body.caption || '',
          generic: Boolean(body.generic),
          fullKey: body.fullKey,
          coverKey: body.coverKey,
          width: Number(body.width) || 0,
          height: Number(body.height) || 0,
          bytes: Number(body.bytes) || 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        }
        await doc.send(new PutCommand({ TableName: IMAGES, Item: image }))
        const [fullUrl, coverUrl] = await Promise.all([signGet(image.fullKey), signGet(image.coverKey)])
        return json(201, { ...image, id: image.imageId, fullUrl, coverUrl, usable: true, usableReason: 'own' })
      }
    }

    // ---- singola ----
    if (seg.length === 2) {
      const imageId = seg[1]
      const current = await doc.send(new GetCommand({ TableName: IMAGES, Key: { imageId } }))
      if (!current.Item) return json(404, { message: 'Immagine non trovata' })

      const storeId = body.storeId || q.storeId
      if (current.Item.ownerStoreId !== storeId) {
        return json(403, { message: 'Immagine di un altro negozio' })
      }

      if (method === 'PUT') {
        const updated = {
          ...current.Item,
          caption: body.caption ?? current.Item.caption,
          generic: body.generic === undefined ? current.Item.generic : Boolean(body.generic),
          updatedAt: new Date().toISOString(),
        }
        await doc.send(new PutCommand({ TableName: IMAGES, Item: updated }))
        return json(200, { ...updated, id: updated.imageId })
      }

      if (method === 'DELETE') {
        // Gli oggetti su S3 vengono spostati sotto deleted/ dalla lifecycle rule:
        // qui basta togliere il metadato perché la foto sparisca dalle schede.
        await Promise.all([
          doc.send(new DeleteCommand({ TableName: IMAGES, Key: { imageId } })),
          s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: current.Item.fullKey })),
          s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: current.Item.coverKey })),
        ])
        return json(200, { id: imageId })
      }
    }

    return json(405, { message: 'Metodo non supportato' })
  } catch (err) {
    console.error(err)
    return json(500, { message: 'Errore interno', detail: err.message })
  }
}
