import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PauseIcon from '@mui/icons-material/PauseCircleOutlined'
import PlayIcon from '@mui/icons-material/PlayCircleOutlined'
import SearchIcon from '@mui/icons-material/SearchOutlined'

import { api } from '../api/client.js'
import { AsyncBlock, ConfirmDialog, EmptyState, PageHeader } from '../components/ui.jsx'
import { availabilityLabel, daysLeft, formatDate, formatPrice, priceFrom } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { useResource } from '../state/useResource.js'

const FILTERS = [
  { value: 'all', label: 'Tutti' },
  { value: 'published', label: 'Online' },
  { value: 'draft', label: 'Bozze' },
  { value: 'paused', label: 'Sospesi' },
  { value: 'scorte', label: 'Scorte critiche' },
  { value: 'scadenza', label: 'Accordi in scadenza' },
]

export function ListingsPage() {
  const { store } = useSession()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const filter = params.get('filtro') || 'all'
  const listings = useResource(() => api.listListingsByStore(store.id), [store.id])

  const visible = useMemo(() => {
    const items = listings.data || []
    const needle = query.trim().toLowerCase()
    return items
      .filter((l) => {
        if (filter === 'scorte')
          return (
            l.availability?.mode === 'stock' &&
            Number(l.availability.stockQty) <= Number(l.availability.lowStockThreshold || 0)
          )
        if (filter === 'scadenza') {
          if (l.availability?.mode !== 'reseller') return false
          const left = daysLeft(l.availability.resellerTo)
          return left !== null && left <= 45
        }
        if (filter === 'all') return true
        return l.status === filter
      })
      .filter(
        (l) =>
          !needle ||
          l.product?.name?.toLowerCase().includes(needle) ||
          l.product?.brand?.toLowerCase().includes(needle) ||
          l.sku?.toLowerCase().includes(needle),
      )
  }, [listings.data, filter, query])

  const setStatus = async (listing, status) => {
    await api.saveListing({ ...listing, status })
    listings.reload()
    toast.success(status === 'published' ? 'Prodotto pubblicato' : 'Prodotto sospeso')
  }

  const remove = async (listing) => {
    await api.deleteListing(listing.storeId, listing.productId)
    listings.reload()
    toast.success(`"${listing.product?.name}" rimosso dal tuo negozio`, {
      onUndo: async () => {
        await api.saveListing(listing)
        listings.reload()
      },
      duration: 8000,
    })
  }

  return (
    <>
      <PageHeader
        title="I miei prodotti"
        subtitle="Le tue proposte di vendita: disponibilità, foto, listino e servizi per ogni prodotto del catalogo."
        actions={[
          <Button key="new" variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/prodotti/nuovo">
            Aggiungi prodotto
          </Button>,
        ]}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        sx={{ mb: 3 }}
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome, marchio o codice…"
          sx={{ minWidth: { md: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_e, v) => v && setParams(v === 'all' ? {} : { filtro: v })}
          sx={{ flexWrap: 'wrap' }}
        >
          {FILTERS.map((f) => (
            <ToggleButton key={f.value} value={f.value}>
              {f.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <AsyncBlock
        resource={listings}
        isEmpty={() => visible.length === 0}
        empty={
          (listings.data || []).length === 0 ? (
            <EmptyState
              icon={<InventoryIcon />}
              title="Non vendi ancora nulla"
              description="Cerca il prodotto nel catalogo condiviso: se c'è già, ti basta aggiungere le tue condizioni di vendita. Se non c'è, lo crei tu."
              action={
                <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/prodotti/nuovo">
                  Aggiungi il primo prodotto
                </Button>
              }
            />
          ) : (
            <EmptyState
              compact
              title="Nessun prodotto con questi criteri"
              description="Prova a cambiare filtro o a svuotare la ricerca."
              action={
                <Button
                  onClick={() => {
                    setQuery('')
                    setParams({})
                  }}
                >
                  Azzera i filtri
                </Button>
              }
            />
          )
        }
      >
        {() => (
          <Grid container spacing={2}>
            {visible.map((listing) => {
              const avail = availabilityLabel(listing.availability)
              const from = priceFrom(listing.pricing)
              const activeServices = (listing.services || []).filter((s) => s.enabled).length
              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} key={listing.productId}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'box-shadow .15s',
                      '&:hover': { boxShadow: 3 },
                    }}
                  >
                    <Box
                      onClick={() => navigate(`/prodotti/${listing.productId}`)}
                      sx={{
                        aspectRatio: '16/10',
                        bgcolor: 'action.hover',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      {listing.coverUrl ? (
                        <Box
                          component="img"
                          src={listing.coverUrl}
                          alt={listing.product?.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                          <Typography variant="caption" color="text.secondary">
                            Nessuna foto
                          </Typography>
                        </Stack>
                      )}
                      <Chip
                        size="small"
                        label={
                          listing.status === 'published'
                            ? 'Online'
                            : listing.status === 'paused'
                              ? 'Sospeso'
                              : 'Bozza'
                        }
                        color={
                          listing.status === 'published'
                            ? 'success'
                            : listing.status === 'paused'
                              ? 'default'
                              : 'warning'
                        }
                        sx={{ position: 'absolute', top: 8, left: 8 }}
                      />
                    </Box>

                    <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="overline" color="text.secondary" display="block">
                            {listing.product?.brand}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
                            {listing.product?.name || listing.productId}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => setMenu({ anchor: e.currentTarget, listing })}
                          aria-label="Altre azioni"
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip size="small" label={avail.label} color={avail.color} variant="outlined" />
                        {activeServices > 0 && (
                          <Chip size="small" variant="outlined" label={`${activeServices} servizi`} />
                        )}
                        {(listing.images || []).length > 0 && (
                          <Chip size="small" variant="outlined" label={`${listing.images.length} foto`} />
                        )}
                      </Stack>

                      <Box sx={{ flex: 1 }} />

                      <Stack
                        direction="row"
                        alignItems="flex-end"
                        justifyContent="space-between"
                        sx={{ mt: 2 }}
                      >
                        <Box>
                          <Typography variant="h3">
                            {from ? formatPrice(from, listing.pricing?.currency) : '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {from ? 'prezzo di partenza' : 'listino da completare'}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          component={RouterLink}
                          to={`/prodotti/${listing.productId}`}
                        >
                          Gestisci
                        </Button>
                      </Stack>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
                        Aggiornato il {formatDate(listing.updatedAt)}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        )}
      </AsyncBlock>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            navigate(`/prodotti/${menu.listing.productId}`)
            setMenu(null)
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Modifica
        </MenuItem>
        {menu?.listing.status === 'published' ? (
          <MenuItem
            onClick={() => {
              setStatus(menu.listing, 'paused')
              setMenu(null)
            }}
          >
            <PauseIcon fontSize="small" sx={{ mr: 1.5 }} /> Sospendi la vendita
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              setStatus(menu.listing, 'published')
              setMenu(null)
            }}
          >
            <PlayIcon fontSize="small" sx={{ mr: 1.5 }} /> Pubblica
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setToDelete(menu.listing)
            setMenu(null)
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Togli dal mio negozio
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Togliere il prodotto dal tuo negozio?"
        description={`"${toDelete?.product?.name}" sparisce dalla tua vetrina. La scheda resta nel catalogo per gli altri venditori e le tue foto restano tue.`}
        confirmLabel="Togli dal negozio"
        destructive
        onConfirm={() => remove(toDelete)}
        onClose={() => setToDelete(null)}
      />
    </>
  )
}
