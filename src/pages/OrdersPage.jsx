import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ChatIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import CheckIcon from '@mui/icons-material/CheckOutlined'
import CloseIcon from '@mui/icons-material/CloseOutlined'
import EventIcon from '@mui/icons-material/EventOutlined'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined'
import PersonIcon from '@mui/icons-material/PersonOutlineOutlined'
import PlaceIcon from '@mui/icons-material/PlaceOutlined'
import BuildIcon from '@mui/icons-material/HandymanOutlined'
import UpdateIcon from '@mui/icons-material/UpdateOutlined'

import { api } from '../api/client.js'
import { ChatDialog } from '../components/ChatDialog.jsx'
import { RejectFulfilmentDialog, RescheduleFulfilmentDialog } from '../components/FulfilmentDialogs.jsx'
import { AsyncBlock, EmptyState, PageHeader, SectionCard, StatCard } from '../components/ui.jsx'
import {
  FULFILMENT_STATUSES,
  SELLER_SERVICE_BY_TYPE,
  formatDate,
  formatPrice,
} from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { useResource } from '../state/useResource.js'

/**
 * Ordini ricevuti — cosa hai venduto e per quando.
 *
 * Ogni acquisto pagato sul sito pubblico si divide in una consegna per negozio:
 * qui c'è solo la propria. La domanda a cui la pagina risponde è operativa —
 * "che cosa devo caricare sul furgone, e quando" — quindi l'ordinamento
 * predefinito è per data di consegna, non per data d'ordine.
 */

const SORTS = [
  { value: 'delivery', label: 'Data di consegna' },
  { value: 'recent', label: 'Ordine più recente' },
  { value: 'value', label: 'Importo' },
]

const TABS = [
  { value: 'todo', label: 'Da confermare' },
  { value: 'upcoming', label: 'In consegna' },
  { value: 'all', label: 'Tutti' },
]

function daysTo(iso) {
  if (!iso) return null
  const target = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

/** "fra 5 giorni", "domani", "oggi", "3 giorni fa". */
function whenLabel(iso) {
  const days = daysTo(iso)
  if (days === null) return 'data da definire'
  if (days === 0) return 'oggi'
  if (days === 1) return 'domani'
  if (days === -1) return 'ieri'
  return days > 0 ? `fra ${days} giorni` : `${Math.abs(days)} giorni fa`
}

export function OrdersPage() {
  const { store } = useSession()
  const toast = useToast()
  const [tab, setTab] = useState('todo')
  const [sort, setSort] = useState('delivery')
  const [query, setQuery] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [chatTarget, setChatTarget] = useState(null)

  const orders = useResource(() => api.listFulfilments(store.id), [store.id])
  const rows = orders.data || []

  async function handleAccept(row) {
    try {
      await api.acceptFulfilment(row.id, store.id)
      toast.success('Consegna accettata')
      orders.reload()
    } catch (err) {
      toast.error(err.message || 'Non è stato possibile accettare la consegna')
    }
  }

  async function handleDeliver(row) {
    try {
      await api.deliverFulfilment(row.id, store.id)
      toast.success('Consegna segnata come consegnata')
      orders.reload()
    } catch (err) {
      toast.error(err.message || 'Non è stato possibile aggiornare la consegna')
    }
  }

  async function handleReject(reason) {
    try {
      await api.rejectFulfilment(rejectTarget.id, store.id, reason)
      toast.success('Consegna rifiutata')
      setRejectTarget(null)
      orders.reload()
    } catch (err) {
      toast.error(err.message || 'Non è stato possibile rifiutare la consegna')
    }
  }

  async function handleReschedule(date, note) {
    try {
      await api.rescheduleFulfilment(rescheduleTarget.id, store.id, date, note)
      toast.success('Nuova data proposta al cliente')
      setRescheduleTarget(null)
      orders.reload()
    } catch (err) {
      toast.error(err.message || 'Non è stato possibile proporre la data')
    }
  }

  const counts = useMemo(
    () => ({
      todo: rows.filter((r) => r.status === 'pending').length,
      upcoming: rows.filter((r) => r.status === 'accepted' && (daysTo(r.confirmedDate || r.requestedDate) ?? -1) >= 0).length,
      pieces: rows
        .filter((r) => r.status !== 'rejected' && r.status !== 'cancelled')
        .reduce((n, r) => n + r.lines.reduce((m, l) => m + l.quantity, 0), 0),
      value: rows.filter((r) => r.status !== 'rejected' && r.status !== 'cancelled').reduce((n, r) => n + r.total, 0),
    }),
    [rows],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = rows

    if (tab === 'todo') list = list.filter((r) => r.status === 'pending')
    if (tab === 'upcoming') {
      list = list.filter(
        (r) => r.status === 'accepted' && (daysTo(r.confirmedDate || r.requestedDate) ?? -1) >= 0,
      )
    }

    if (q) {
      list = list.filter(
        (r) =>
          r.reference.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.shipping.city.toLowerCase().includes(q) ||
          r.lines.some((l) => l.name.toLowerCase().includes(q)),
      )
    }

    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sort === 'value') return b.total - a.total
      if (sort === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '')
      const da = a.confirmedDate || a.requestedDate || '9999'
      const db = b.confirmedDate || b.requestedDate || '9999'
      return da.localeCompare(db)
    })
    return sorted
  }, [rows, tab, sort, query])

  return (
    <>
      <PageHeader
        title="Ordini ricevuti"
        subtitle="Gli acquisti pagati sul marketplace che riguardano il tuo negozio: cosa devi consegnare, a chi e per quando."
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Da confermare"
            value={counts.todo}
            hint={counts.todo ? 'Il cliente sta aspettando una risposta' : 'Nessuna richiesta aperta'}
            tone={counts.todo ? 'warning' : 'default'}
            onClick={() => setTab('todo')}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="In consegna" value={counts.upcoming} hint="Date già confermate" onClick={() => setTab('upcoming')} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Pezzi venduti" value={counts.pieces} hint="Ordini non rifiutati" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Valore" value={formatPrice(counts.value)} hint="Merce e trasporto" />
        </Grid>
      </Grid>

      <SectionCard
        title="Elenco"
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small"
              placeholder="Cerca ordine, cliente, città o mobile"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ minWidth: 260 }}
            />
            <TextField
              select
              size="small"
              label="Ordina per"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              {SORTS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      >
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
          {TABS.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              label={
                t.value === 'todo' && counts.todo ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{t.label}</span>
                    <Chip size="small" color="warning" label={counts.todo} />
                  </Stack>
                ) : (
                  t.label
                )
              }
            />
          ))}
        </Tabs>

        <AsyncBlock
          resource={orders}
          isEmpty={() => visible.length === 0}
          empty={
            <EmptyState
              icon={<InventoryIcon fontSize="large" />}
              title={rows.length === 0 ? 'Nessun ordine ricevuto' : 'Nessun ordine in questa vista'}
              description={
                rows.length === 0
                  ? 'Quando un compratore acquista un tuo mobile sul marketplace, la consegna compare qui.'
                  : 'Cambia scheda o svuota la ricerca per vedere gli altri ordini.'
              }
            />
          }
        >
          {() => (
            <Stack spacing={1.5}>
              {visible.map((row) => (
                <OrderRow
                  key={row.id}
                  row={row}
                  onAccept={() => handleAccept(row)}
                  onReject={() => setRejectTarget(row)}
                  onReschedule={() => setRescheduleTarget(row)}
                  onDeliver={() => handleDeliver(row)}
                  onChat={() => setChatTarget(row)}
                />
              ))}
            </Stack>
          )}
        </AsyncBlock>
      </SectionCard>

      <RejectFulfilmentDialog
        open={!!rejectTarget}
        fulfilment={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
      <RescheduleFulfilmentDialog
        open={!!rescheduleTarget}
        fulfilment={rescheduleTarget}
        store={store}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleReschedule}
      />
      <ChatDialog
        open={!!chatTarget}
        threadId={chatTarget?.id}
        storeId={store.id}
        onClose={() => setChatTarget(null)}
      />
    </>
  )
}

function OrderRow({ row, onAccept, onReject, onReschedule, onDeliver, onChat }) {
  const status = FULFILMENT_STATUSES[row.status] || FULFILMENT_STATUSES.pending
  const date = row.confirmedDate || (row.status === 'rescheduled' ? row.proposedDate : null) || row.requestedDate
  const late = row.status === 'pending' && (daysTo(date) ?? 99) <= 3

  return (
    <Box sx={{ border: 1, borderColor: late ? 'warning.main' : 'divider', p: 2 }}>
      <Grid container spacing={2}>
        {/* Quando: la colonna che conta per chi carica il furgone. */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <EventIcon fontSize="small" color="action" />
              <Typography variant="subtitle2">{formatDate(date)}</Typography>
            </Stack>
            <Typography variant="body2" color={late ? 'warning.main' : 'text.secondary'}>
              {whenLabel(date)}
              {row.confirmedDate
                ? ' · confermata'
                : row.status === 'rescheduled'
                  ? ' · proposta da te'
                  : ' · richiesta dal cliente'}
            </Typography>
            <Box>
              <Chip size="small" color={status.color} label={status.label} />
            </Box>
          </Stack>
        </Grid>

        {/* Cosa */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={0.5}>
            {row.lines.map((line) => (
              <Stack key={line.itemId} direction="row" spacing={1} alignItems="baseline">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {line.quantity}×
                </Typography>
                <Typography variant="body2">{line.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {line.category}
                </Typography>
              </Stack>
            ))}
            {row.requestedServices?.length > 0 && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                <BuildIcon fontSize="small" color="action" />
                {row.requestedServices.map((t) => (
                  <Chip
                    key={t}
                    size="small"
                    variant="outlined"
                    label={SELLER_SERVICE_BY_TYPE[t]?.label || t}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Grid>

        {/* A chi */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">{row.customerName}</Typography>
              </Stack>
              <Typography variant="subtitle2">{formatPrice(row.total)}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <PlaceIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {row.shipping.address}, {row.shipping.postalCode} {row.shipping.city}
              </Typography>
            </Stack>
            {row.shipping.notes && (
              <Typography variant="caption" color="text.secondary">
                “{row.shipping.notes}”
              </Typography>
            )}
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              Ordine {row.reference} · {formatDate(row.createdAt)}
            </Typography>
          </Stack>
        </Grid>
      </Grid>

      <Divider sx={{ my: 1.5 }} />
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
        {row.status === 'pending' && (
          <>
            <Button size="small" variant="contained" startIcon={<CheckIcon />} onClick={onAccept}>
              Accetta
            </Button>
            <Button size="small" variant="outlined" startIcon={<UpdateIcon />} onClick={onReschedule}>
              Riprogramma
            </Button>
            <Button size="small" color="error" startIcon={<CloseIcon />} onClick={onReject}>
              Rifiuta
            </Button>
          </>
        )}
        {row.status === 'rescheduled' && (
          <Chip size="small" variant="outlined" label="In attesa che il cliente risponda alla proposta" />
        )}
        {row.status === 'accepted' && (
          <Button size="small" variant="contained" startIcon={<LocalShippingIcon />} onClick={onDeliver}>
            Segna come consegnata
          </Button>
        )}
        <Button size="small" color="inherit" startIcon={<ChatIcon />} onClick={onChat}>
          Chat
        </Button>
      </Stack>
    </Box>
  )
}
