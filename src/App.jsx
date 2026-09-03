import { useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'

import { Shell } from './components/Shell.jsx'
import { Spinner } from './components/ui.jsx'
import { SessionProvider, useSession } from './state/SessionProvider.jsx'
import { ToastProvider } from './state/ToastProvider.jsx'
import { buildTheme } from './theme.js'

import { AccessPage } from './pages/AccessPage.jsx'
import { CatalogPage } from './pages/CatalogPage.jsx'
import { CatalogProductPage } from './pages/CatalogProductPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { ListingEditorPage } from './pages/ListingEditorPage.jsx'
import { ListingsPage } from './pages/ListingsPage.jsx'
import { NewProductPage } from './pages/NewProductPage.jsx'
import { PermissionsPage } from './pages/PermissionsPage.jsx'
import { ReportsPage } from './pages/ReportsPage.jsx'
import { OrdersPage } from './pages/OrdersPage.jsx'
import { StoreProfilePage } from './pages/StoreProfilePage.jsx'
import { StoreWizardPage } from './pages/StoreWizardPage.jsx'

const THEME_KEY = 'gestionale.theme'

export function App() {
  const [mode, setMode] = useState(() => localStorage.getItem(THEME_KEY) || 'light')
  const theme = useMemo(() => buildTheme(mode), [mode])

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <SessionProvider>
          <AppRoutes mode={mode} onToggleMode={toggleMode} />
        </SessionProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

function AppRoutes({ mode, onToggleMode }) {
  return (
    <Routes>
      <Route path="/accesso" element={<AccessPage />} />
      <Route path="/benvenuto" element={<StoreWizardPage />} />
      <Route
        element={
          <RequireStore>
            <Shell mode={mode} onToggleMode={onToggleMode} />
          </RequireStore>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="/prodotti" element={<ListingsPage />} />
        <Route path="/prodotti/nuovo" element={<NewProductPage />} />
        <Route path="/prodotti/:productId" element={<ListingEditorPage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/catalogo/:productId" element={<CatalogProductPage />} />
        <Route path="/ordini" element={<OrdersPage />} />
        <Route path="/negozio" element={<StoreProfilePage />} />
        <Route path="/permessi" element={<PermissionsPage />} />
        <Route path="/segnalazioni" element={<ReportsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function RequireStore({ children }) {
  const { store, loading } = useSession()
  const location = useLocation()
  if (loading) return <Spinner label="Carico il negozio…" />
  if (!store) return <Navigate to="/accesso" replace state={{ from: location.pathname }} />
  return children
}
