import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, DATA_MODE } from '../api/client.js'

const SESSION_KEY = 'gestionale.session.v1'
// Stessa chiave con cui il sito pubblico tiene il proprio token: cosi'
// l'adapter HTTP del gestionale (vedi api/http/adapter.js) lo trova e basta.
const AUTH_TOKEN_KEY = 'allena.token'
const SessionContext = createContext(null)

// In modalita' cloud le rotte /orders e /chat del marketplace vogliono un
// token Bearer, ma qui non esiste un login vero (vedi README): al cambio di
// negozio si "prende in prestito" un accesso demo con la stessa email del
// negozio. Se coincide con un utente gia' seminato sul marketplace — i negozi
// demo lo sono — il token arriva con lo storeId giusto, esattamente come se
// ci si fosse loggati dal sito pubblico. Un negozio aperto da qui e mai
// esistito la' come utente riceve invece un token con lo storeId sbagliato
// (vedi README): non blocca il resto del gestionale, che non ne ha bisogno.
async function bridgeMarketplaceAuth(email) {
  if (DATA_MODE !== 'cloud' || !email) return
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return
  try {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, role: 'store' }),
    })
    if (!res.ok) return
    const data = await res.json()
    if (data?.token) localStorage.setItem(AUTH_TOKEN_KEY, data.token)
  } catch {
    // Resta senza token finche' non si riprova: le rotte /orders e /chat
    // risponderanno 401/403, il resto del gestionale funziona comunque.
  }
}

/**
 * Sessione del venditore: quale negozio si sta gestendo. L'autenticazione vera
 * (Cognito/JWT) sta sul marketplace; qui si conserva solo il negozio corrente,
 * come fa il frontend pubblico con il token di negozio.
 */
export function SessionProvider({ children }) {
  const [storeId, setStoreId] = useState(() => localStorage.getItem(SESSION_KEY) || '')
  const [store, setStore] = useState(null)
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  const loadStores = useCallback(async () => {
    const list = await api.listStores()
    setStores(list)
    return list
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await loadStores()
        if (!alive) return
        const current = list.find((s) => s.id === storeId) || null
        setStore(current)
        if (!current && storeId) localStorage.removeItem(SESSION_KEY)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [storeId, loadStores])

  const signIn = useCallback((id, email) => {
    localStorage.setItem(SESSION_KEY, id)
    setStoreId(id)
    setLoading(true)
    void bridgeMarketplaceAuth(email)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setStoreId('')
    setStore(null)
  }, [])

  const refreshStore = useCallback(async () => {
    if (!storeId) return null
    const fresh = await api.getStore(storeId)
    setStore(fresh)
    setStores((prev) => prev.map((s) => (s.id === fresh.id ? fresh : s)))
    return fresh
  }, [storeId])

  const registerStore = useCallback(
    async (input) => {
      const created = await api.createStore(input)
      await loadStores()
      signIn(created.id, created.email)
      return created
    },
    [loadStores, signIn],
  )

  const value = useMemo(
    () => ({ store, storeId, stores, loading, signIn, signOut, refreshStore, registerStore, loadStores }),
    [store, storeId, stores, loading, signIn, signOut, refreshStore, registerStore, loadStores],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession va usato dentro SessionProvider')
  return ctx
}
