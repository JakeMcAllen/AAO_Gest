import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Carica dati asincroni con stato esplicito. Ogni pagina che legge dati mostra
 * i tre stati (caricamento / errore con retry / vuoto) senza reinventarli.
 *
 * @param {() => Promise<any>} loader
 * @param {any[]} deps
 */
export function useResource(loader, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const seq = useRef(0)

  const run = useCallback(async () => {
    const current = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const result = await loader()
      if (current === seq.current) setData(result)
    } catch (err) {
      if (current === seq.current) setError(err)
    } finally {
      if (current === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { data, loading, error, reload: run, setData }
}

/** Valore ritardato: usato per le ricerche a digitazione senza martellare l'API. */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
