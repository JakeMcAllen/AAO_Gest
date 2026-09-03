'use strict'

// Segnalazioni sui contenuti — /reports
//
//   GET  /reports?storeId        { sent, received }
//   GET  /reports?status=open    coda di moderazione della piattaforma
//   POST /reports                nuova segnalazione (commento obbligatorio)
//   PUT  /reports/{id}           aggiornamento di stato dal negozio segnalato
//
// Tabella dedicata (<prefix>-content-reports), separata da catalogo e proposte:
// le segnalazioni sopravvivono alla cancellazione del contenuto segnalato e
// restano consultabili per audit.

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
const REPORTS = process.env.TABLE_REPORTS
const CATALOG = process.env.TABLE_CATALOG
const IMAGES = process.env.TABLE_IMAGES
const STORES = process.env.TABLE_STORES

const VALID_TARGETS = ['product', 'image', 'listing', 'store']
const VALID_REASONS = ['wrong_data', 'duplicate', 'copyright', 'misleading', 'inappropriate', 'other']
const VALID_STATUSES = ['open', 'in_review', 'resolved', 'rejected']
const MIN_COMMENT = 20

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
      TableName: REPORTS,
      IndexName: indexName,
      KeyConditionExpression: `#k = :v`,
      ExpressionAttributeNames: { '#k': keyName },
      ExpressionAttributeValues: { ':v': value },
    }),
  )
  return res.Items || []
}

/** Etichetta leggibile del contenuto segnalato, per la lista in interfaccia. */
async function describe(reports) {
  const products = await batchGet(
    CATALOG,
    reports
      .filter((r) => r.targetType === 'product')
      .map((r) => ({ id: r.targetId }))
      .concat(
        reports
          .filter((r) => r.targetType === 'listing')
          .map((r) => ({ id: String(r.targetId).split('#')[1] })),
      ),
  )
  const images = await batchGet(
    IMAGES,
    reports.filter((r) => r.targetType === 'image').map((r) => ({ imageId: r.targetId })),
  )
  const stores = await batchGet(
    STORES,
    reports.flatMap((r) => [
      { id: r.reporterStoreId },
      { id: r.targetOwnerStoreId },
      ...(r.targetType === 'store' ? [{ id: r.targetId }] : []),
      ...(r.targetType === 'listing' ? [{ id: String(r.targetId).split('#')[0] }] : []),
    ]),
  )
  const byProduct = Object.fromEntries(products.map((p) => [p.id, p]))
  const byImage = Object.fromEntries(images.map((i) => [i.imageId, i]))
  const byStore = Object.fromEntries(stores.map((s) => [s.id, s]))

  return reports.map((r) => {
    let targetLabel = r.targetId
    if (r.targetType === 'product') targetLabel = labelProduct(byProduct[r.targetId], r.targetId)
    if (r.targetType === 'store') targetLabel = byStore[r.targetId]?.name || r.targetId
    if (r.targetType === 'image') {
      const image = byImage[r.targetId]
      targetLabel = image ? `Foto "${image.caption || 'senza didascalia'}"` : r.targetId
    }
    if (r.targetType === 'listing') {
      const [storeId, productId] = String(r.targetId).split('#')
      targetLabel = `${byProduct[productId]?.name || productId} presso ${byStore[storeId]?.name || storeId}`
    }
    return {
      ...r,
      targetLabel,
      reporterStore: byStore[r.reporterStoreId] || null,
      targetOwnerStore: byStore[r.targetOwnerStoreId] || null,
    }
  })
}

function labelProduct(product, fallback) {
  return product ? `${product.brand} — ${product.name}` : fallback
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
        // Coda di moderazione: tutte le segnalazioni in un dato stato.
        if (q.status) {
          if (!VALID_STATUSES.includes(q.status)) return json(400, { message: 'Stato non valido' })
          const items = await queryBy('reportStatus-index', 'status', q.status)
          return json(200, await describe(items))
        }

        if (!q.storeId) return json(400, { message: 'storeId oppure status obbligatorio' })
        const [sent, received] = await Promise.all([
          queryBy('reporterStoreId-index', 'reporterStoreId', q.storeId),
          queryBy('targetOwnerStoreId-index', 'targetOwnerStoreId', q.storeId),
        ])
        const decorated = await describe([...sent, ...received])
        const byId = Object.fromEntries(decorated.map((r) => [r.id, r]))
        return json(200, {
          sent: sent.map((r) => byId[r.id]),
          received: received.map((r) => byId[r.id]),
        })
      }

      if (method === 'POST') {
        const { targetType, targetId, targetOwnerStoreId, reporterStoreId, reason, comment } = body
        if (!VALID_TARGETS.includes(targetType)) return json(400, { message: 'Tipo di contenuto non valido' })
        if (!VALID_REASONS.includes(reason)) return json(400, { message: 'Motivo non valido' })
        if (!targetId || !targetOwnerStoreId || !reporterStoreId) {
          return json(400, { message: 'Contenuto, proprietario e segnalante sono obbligatori' })
        }
        if (!comment || comment.trim().length < MIN_COMMENT) {
          return json(400, { message: `Il commento deve avere almeno ${MIN_COMMENT} caratteri` })
        }
        if (targetOwnerStoreId === reporterStoreId) {
          return json(400, { message: 'Non puoi segnalare i tuoi stessi contenuti' })
        }

        const now = new Date().toISOString()
        const report = {
          id: crypto.randomUUID(),
          targetType,
          targetId,
          targetOwnerStoreId,
          reporterStoreId,
          reason,
          comment: comment.trim(),
          status: 'open',
          resolutionNote: '',
          createdAt: now,
          updatedAt: now,
        }
        await doc.send(new PutCommand({ TableName: REPORTS, Item: report }))
        return json(201, report)
      }
    }

    if (seg.length === 2 && method === 'PUT') {
      const id = seg[1]
      const res = await doc.send(new GetCommand({ TableName: REPORTS, Key: { id } }))
      if (!res.Item) return json(404, { message: 'Segnalazione non trovata' })
      if (res.Item.targetOwnerStoreId !== body.storeId) {
        return json(403, { message: 'Solo il negozio segnalato può aggiornare lo stato' })
      }
      if (body.status && !VALID_STATUSES.includes(body.status)) {
        return json(400, { message: 'Stato non valido' })
      }
      const updated = {
        ...res.Item,
        status: body.status || res.Item.status,
        resolutionNote: body.resolutionNote ?? res.Item.resolutionNote,
        updatedAt: new Date().toISOString(),
      }
      await doc.send(new PutCommand({ TableName: REPORTS, Item: updated }))
      return json(200, updated)
    }

    return json(405, { message: 'Metodo non supportato' })
  } catch (err) {
    console.error(err)
    return json(500, { message: 'Errore interno', detail: err.message })
  }
}
