'use strict'

// Permessi d'uso dei contenuti fra negozi — /permissions
//
//   GET  /permissions?storeId    { incoming, outgoing }
//   POST /permissions            nuova richiesta
//   PUT  /permissions/{id}       risposta del proprietario (concedi/rifiuta/revoca)
//
// Solo il proprietario dei contenuti (ownerStoreId) può cambiare lo stato: è la
// regola che rende il permesso "esplicito" e revocabile in qualsiasi momento.

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const {
  DynamoDBDocumentClient,
  BatchGetCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb')
const crypto = require('crypto')

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const PERMISSIONS = process.env.TABLE_PERMISSIONS
const CATALOG = process.env.TABLE_CATALOG
const STORES = process.env.TABLE_STORES
const VALID_SCOPES = ['images', 'description', 'price_table', 'services']
const VALID_STATUSES = ['pending', 'granted', 'denied', 'revoked']

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

async function batchGet(table, keys) {
  const seen = new Set()
  const unique = keys.filter((k) => {
    const sig = JSON.stringify(k)
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
  if (!unique.length) return []
  const res = await doc.send(new BatchGetCommand({ RequestItems: { [table]: { Keys: unique } } }))
  return (res.Responses || {})[table] || []
}

async function queryBy(indexName, keyName, value) {
  const res = await doc.send(
    new QueryCommand({
      TableName: PERMISSIONS,
      IndexName: indexName,
      KeyConditionExpression: `${keyName} = :v`,
      ExpressionAttributeValues: { ':v': value },
    }),
  )
  return res.Items || []
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
        if (!q.storeId) return json(400, { message: 'storeId obbligatorio' })
        const [incoming, outgoing] = await Promise.all([
          queryBy('ownerStoreId-index', 'ownerStoreId', q.storeId),
          queryBy('requesterStoreId-index', 'requesterStoreId', q.storeId),
        ])
        const all = [...incoming, ...outgoing]
        const [stores, products] = await Promise.all([
          batchGet(
            STORES,
            all.flatMap((p) => [{ id: p.ownerStoreId }, { id: p.requesterStoreId }]),
          ),
          batchGet(
            CATALOG,
            all.map((p) => ({ id: p.productId })),
          ),
        ])
        const byStore = Object.fromEntries(stores.map((s) => [s.id, s]))
        const byProduct = Object.fromEntries(products.map((p) => [p.id, p]))
        const decorate = (p) => ({
          ...p,
          ownerStore: byStore[p.ownerStoreId] || null,
          requesterStore: byStore[p.requesterStoreId] || null,
          product: byProduct[p.productId] || null,
        })
        return json(200, { incoming: incoming.map(decorate), outgoing: outgoing.map(decorate) })
      }

      if (method === 'POST') {
        const { productId, ownerStoreId, requesterStoreId, scopes = [], message = '' } = body
        if (!productId || !ownerStoreId || !requesterStoreId) {
          return json(400, { message: 'productId, ownerStoreId e requesterStoreId obbligatori' })
        }
        if (ownerStoreId === requesterStoreId) {
          return json(400, { message: 'Non serve un permesso sui propri contenuti' })
        }
        const clean = scopes.filter((s) => VALID_SCOPES.includes(s))
        if (!clean.length) return json(400, { message: 'Indicare almeno un ambito valido' })

        const existing = await queryBy('requesterStoreId-index', 'requesterStoreId', requesterStoreId)
        const duplicate = existing.find(
          (p) =>
            p.productId === productId &&
            p.ownerStoreId === ownerStoreId &&
            ['pending', 'granted'].includes(p.status),
        )
        if (duplicate) {
          return json(409, { message: 'Esiste già una richiesta attiva per questo contenuto' })
        }

        const now = new Date().toISOString()
        const permission = {
          id: crypto.randomUUID(),
          productId,
          ownerStoreId,
          requesterStoreId,
          scopes: clean,
          message,
          status: 'pending',
          responseNote: '',
          expiresAt: '',
          createdAt: now,
          updatedAt: now,
        }
        await doc.send(new PutCommand({ TableName: PERMISSIONS, Item: permission }))
        return json(201, permission)
      }
    }

    if (seg.length === 2 && method === 'PUT') {
      const id = seg[1]
      const res = await doc.send(new GetCommand({ TableName: PERMISSIONS, Key: { id } }))
      if (!res.Item) return json(404, { message: 'Richiesta non trovata' })
      if (res.Item.ownerStoreId !== body.storeId) {
        return json(403, { message: 'Solo il proprietario dei contenuti può rispondere' })
      }
      if (body.status && !VALID_STATUSES.includes(body.status)) {
        return json(400, { message: 'Stato non valido' })
      }
      const updated = {
        ...res.Item,
        status: body.status || res.Item.status,
        responseNote: body.responseNote ?? res.Item.responseNote,
        expiresAt: body.expiresAt ?? res.Item.expiresAt,
        updatedAt: new Date().toISOString(),
      }
      await doc.send(new PutCommand({ TableName: PERMISSIONS, Item: updated }))
      return json(200, updated)
    }

    return json(405, { message: 'Metodo non supportato' })
  } catch (err) {
    console.error(err)
    return json(500, { message: 'Errore interno', detail: err.message })
  }
}
