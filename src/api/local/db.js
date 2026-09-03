// Persistenza della modalità demo: un unico documento JSON in localStorage.
// La stessa forma dei dati che in cloud finisce sulle tabelle DynamoDB, così il
// passaggio fra i due adapter non cambia una riga di interfaccia.

import { buildSeed } from '../../data/seed.js'

const KEY = 'gestionale.db.v1'
let cache = null

function load() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      cache = JSON.parse(raw)
      if (cache?.version === 1) return cache
    }
  } catch {
    // documento corrotto: si riparte dal dataset demo
  }
  cache = buildSeed()
  persist()
  return cache
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch (err) {
    console.warn('Spazio locale esaurito, dati non salvati', err)
  }
}

export const db = {
  read() {
    return load()
  },
  /** Applica una mutazione e salva. Il valore restituito dal mutator torna al chiamante. */
  write(mutator) {
    const data = load()
    const result = mutator(data)
    persist()
    return result
  },
  reset() {
    cache = buildSeed()
    persist()
    return cache
  },
}

export function uid(prefix) {
  const rnd =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rnd}`
}

export function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value))
}
