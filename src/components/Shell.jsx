import { useMemo, useState } from 'react'
import { Link as RouterLink, NavLink, Outlet, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'

import AddIcon from '@mui/icons-material/Add'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined'
import FlagIcon from '@mui/icons-material/OutlinedFlag'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import LogoutIcon from '@mui/icons-material/LogoutOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined'
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined'

import { api, DATA_MODE } from '../api/client.js'
import { useSession } from '../state/SessionProvider.jsx'
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined'

import { useResource } from '../state/useResource.js'

const DRAWER_WIDTH = 258

const NAV = [
  {
    heading: 'Vendita',
    items: [
      { to: '/', label: 'Panoramica', icon: <DashboardIcon />, end: true },
      { to: '/prodotti', label: 'I miei prodotti', icon: <InventoryIcon /> },
      { to: '/catalogo', label: 'Catalogo globale', icon: <SearchIcon /> },
      { to: '/ordini', label: 'Ordini ricevuti', icon: <ReceiptIcon />, badge: 'orders' },
    ],
  },
  {
    heading: 'Negozio',
    items: [
      { to: '/negozio', label: 'Profilo e aree', icon: <StorefrontIcon /> },
      { to: '/permessi', label: 'Permessi contenuti', icon: <VpnKeyIcon />, badge: 'permissions' },
      { to: '/segnalazioni', label: 'Segnalazioni', icon: <FlagIcon />, badge: 'reports' },
    ],
  },
]

export function Shell({ mode, onToggleMode }) {
  const { store, stores, signIn, signOut } = useSession()
  const location = useLocation()
  const isDesktop = useMediaQuery((t) => t.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [storeMenu, setStoreMenu] = useState(null)

  // Contatori delle voci che richiedono un'azione, ricalcolati a ogni cambio pagina.
  const counters = useResource(async () => {
    if (!store) return { permissions: 0, reports: 0, orders: 0 }
    const [permissions, reports, orders] = await Promise.all([
      api.listPermissions(store.id),
      api.listReports(store.id),
      // Un ordine senza risposta e' la cosa piu' urgente della giornata: se il
      // marketplace non risponde, il conteggio resta a zero invece di rompere
      // la navigazione.
      api.listFulfilments(store.id).catch(() => []),
    ])
    return {
      permissions: permissions.incoming.filter((p) => p.status === 'pending').length,
      reports: reports.received.filter((r) => r.status === 'open').length,
      orders: orders.filter((o) => o.status === 'pending').length,
    }
  }, [store?.id, location.pathname])

  const badges = counters.data || { permissions: 0, reports: 0, orders: 0 }

  const drawer = useMemo(
    () => (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Toolbar sx={{ px: 2.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 300, letterSpacing: '0.02em', lineHeight: 1 }}>
              allena
            </Typography>
            <Typography
              variant="h6"
              sx={{ letterSpacing: '0.16em', lineHeight: 1.2, color: 'primary.main' }}
            >
              ARREDAMENTI
            </Typography>
          </Box>
        </Toolbar>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
          {NAV.map((group) => (
            <List
              key={group.heading}
              dense
              sx={{ px: 1.5 }}
              subheader={
                <ListSubheader disableSticky sx={{ bgcolor: 'transparent', fontSize: 11, letterSpacing: '0.12em' }}>
                  {group.heading.toUpperCase()}
                </ListSubheader>
              }
            >
              {group.items.map((item) => {
                const count = item.badge ? badges[item.badge] : 0
                return (
                  <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      mb: 0.25,
                      '&.active': {
                        bgcolor: 'action.selected',
                        color: 'primary.main',
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                    <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}>
                      {item.label}
                    </ListItemText>
                    {count > 0 && <Badge color="primary" badgeContent={count} sx={{ mr: 1.5 }} />}
                  </ListItemButton>
                )
              })}
            </List>
          ))}
        </Box>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/prodotti/nuovo"
            onClick={() => setMobileOpen(false)}
          >
            Aggiungi prodotto
          </Button>
          <Chip
            size="small"
            variant="outlined"
            label={DATA_MODE === 'cloud' ? 'DynamoDB + S3' : 'Dati demo locali'}
            sx={{ mt: 1.5, width: '100%' }}
          />
        </Box>
      </Box>
    ),
    [badges],
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
            aria-label="Apri il menu"
          >
            <MenuIcon />
          </IconButton>

          <Button
            onClick={(e) => setStoreMenu(e.currentTarget)}
            sx={{ textAlign: 'left', color: 'text.primary', minWidth: 0 }}
            startIcon={
              <Avatar
                src={store?.logoUrl}
                variant="rounded"
                sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 13 }}
              >
                {store?.name?.[0] || '?'}
              </Avatar>
            }
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {store?.name || 'Nessun negozio'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {store ? `${store.city} · ${store.region}` : '—'}
              </Typography>
            </Box>
          </Button>
          <Menu anchorEl={storeMenu} open={Boolean(storeMenu)} onClose={() => setStoreMenu(null)}>
            <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
              Cambia negozio
            </Typography>
            {stores.map((s) => (
              <MenuItem
                key={s.id}
                selected={s.id === store?.id}
                onClick={() => {
                  signIn(s.id, s.email)
                  setStoreMenu(null)
                }}
              >
                <ListItemText primary={s.name} secondary={`${s.city} · ${s.region}`} />
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              onClick={() => {
                setStoreMenu(null)
                signOut()
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Esci
            </MenuItem>
          </Menu>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title={mode === 'dark' ? 'Tema chiaro' : 'Tema scuro'}>
              <IconButton onClick={onToggleMode} aria-label="Cambia tema">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}
