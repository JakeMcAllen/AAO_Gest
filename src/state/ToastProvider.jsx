import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'

const ToastContext = createContext(null)

/**
 * Notifiche non bloccanti. Ogni messaggio può portare un'azione di annullamento:
 * l'operazione avviene subito e il negozio ha qualche secondo per tornare indietro,
 * invece di dover confermare ogni volta con un dialogo.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, options = {}) => {
    setToast({ message, severity: 'success', duration: 4000, ...options, key: Date.now() })
  }, [])

  const value = useMemo(
    () => ({
      show,
      success: (message, options) => show(message, { severity: 'success', ...options }),
      error: (message, options) => show(message, { severity: 'error', duration: 7000, ...options }),
      info: (message, options) => show(message, { severity: 'info', ...options }),
      warning: (message, options) => show(message, { severity: 'warning', ...options }),
    }),
    [show],
  )

  const close = (_event, reason) => {
    if (reason === 'clickaway') return
    setToast(null)
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={toast?.duration ?? 4000}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={close}
          severity={toast?.severity || 'success'}
          variant="filled"
          sx={{ alignItems: 'center', boxShadow: 6 }}
          action={
            toast?.onUndo ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  toast.onUndo()
                  setToast(null)
                }}
              >
                Annulla
              </Button>
            ) : undefined
          }
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast va usato dentro ToastProvider')
  return ctx
}
