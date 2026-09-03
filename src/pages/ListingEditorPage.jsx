import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined'
import CloudDoneIcon from '@mui/icons-material/CloudDoneOutlined'
import ErrorIcon from '@mui/icons-material/ErrorOutlineOutlined'
import FlagIcon from '@mui/icons-material/OutlinedFlag'
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined'

import { api } from '../api/client.js'
import { AvailabilityEditor } from '../components/AvailabilityEditor.jsx'
import { CharacteristicsEditor } from '../components/CharacteristicsEditor.jsx'
import { ImageManager } from '../components/ImageManager.jsx'
import { PriceTableEditor } from '../components/PriceTableEditor.jsx'
import { ServicesEditor } from '../components/ServicesEditor.jsx'
import { PermissionDialog, ReportDialog } from '../components/dialogs.jsx'
import { AsyncBlock, Labeled, PageHeader, SectionCard, Spinner } from '../components/ui.jsx'
import { availabilityLabel, daysLeft, emptyListing, formatPrice, priceFrom } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { useResource } from '../state/useResource.js'

const TABS = [
  { value: 'disponibilita', label: 'Disponibilità' },
  { value: 'foto', label: 'Fotografie' },
  { value: 'caratteristiche', label: 'Caratteristiche' },
  { value: 'listino', label: 'Listino' },
  { value: 'servizi', label: 'Servizi' },
  { value: 'pubblicazione', label: 'Pubblicazione' },
]

export function ListingEditorPage() {
  const { productId } = useParams()
  const { store } = useSession()
  const toast = useToast()
  const navigate = useNavigate()

  const [tab, setTab] = useState('disponibilita')
  const [draft, setDraft] = useState(null)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [reportTarget, setReportTarget] = useState(null)
  const [permissionRequest, setPermissionRequest] = useState(null)
  const saveTimer = useRef(null)
  const dirty = useRef(false)

  const context = useResource(async () => {
    const [product, listing, siblings, myListings, permissions] = await Promise.all([
      api.getProduct(productId),
      api.getListing(store.id, productId),
      api.listListingsByProduct(productId),
      api.listListingsByStore(store.id),
      api.listPermissions(store.id),
    ])
    return { product, listing, siblings, myListings, permissions }
  }, [productId, store.id])

  useEffect(() => {
    if (context.data && !draft) {
      setDraft(context.data.listing || emptyListing(store.id, productId))
    }
  }, [context.data, draft, productId, store.id])

  // Salvataggio automatico: il negozio non deve ricordarsi di premere "salva".
  const scheduleSave = useCallback(
    (next) => {
      dirty.current = true
      setSaveState('saving')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        try {
          await api.saveListing(next)
          dirty.current = false
          setSaveState('saved')
        } catch (err) {
          setSaveState('idle')
          toast.error(`Salvataggio non riuscito: ${err.message}`)
        }
      }, 800)
    },
    [toast],
  )

  const update = useCallback(
    (patch) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  // Avvisa se si chiude la pagina con modifiche non ancora scritte.
  useEffect(() => {
    const handler = (event) => {
      if (dirty.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const checks = useMemo(() => (draft ? buildChecklist(draft) : []), [draft])
  const blocking = checks.filter((c) => !c.ok && c.required)

  const importOptions = useMemo(() => {
    if (!context.data || !draft) return []
    const { myListings, siblings, permissions } = context.data
    const mine = myListings
      .filter((l) => l.productId !== productId && l.pricing?.rows?.length)
      .map((l) => ({
        id: `mine-${l.productId}`,
        label: `Il tuo listino di "${l.product?.name || l.productId}"`,
        hint: `${l.pricing.columns.length} colonne · ${l.pricing.rows.length} righe`,
        pricing: l.pricing,
      }))
    const granted = siblings
      .filter((l) => l.storeId !== store.id)
      .filter((l) =>
        permissions.outgoing.some(
          (p) =>
            p.status === 'granted' &&
            p.ownerStoreId === l.storeId &&
            p.productId === productId &&
            p.scopes.includes('price_table'),
        ),
      )
      .map((l) => ({
        id: `granted-${l.storeId}`,
        label: `Struttura concessa da ${l.store?.name || l.storeId}`,
        hint: 'Permesso attivo sulla struttura del listino',
        pricing: l.pricing,
      }))
    return [...mine, ...granted]
  }, [context.data, draft, productId, store.id])

  const publish = async () => {
    if (blocking.length) {
      setTab('pubblicazione')
      toast.warning('Completa i punti mancanti prima di pubblicare')
      return
    }
    const next = { ...draft, status: 'published' }
    setDraft(next)
    await api.saveListing(next)
    setSaveState('saved')
    toast.success('Prodotto pubblicato sul marketplace')
  }

  const unpublish = async () => {
    const next = { ...draft, status: 'paused' }
    setDraft(next)
    await api.saveListing(next)
    toast.info('Vendita sospesa: il prodotto non è più visibile ai compratori')
  }

  return (
    <AsyncBlock resource={context} skeleton={<Spinner label="Carico la scheda…" />}>
      {({ product, siblings }) => {
        if (!draft) return <Spinner />
        const others = siblings.filter((l) => l.storeId !== store.id)
        const avail = availabilityLabel(draft.availability)
        const from = priceFrom(draft.pricing)

        return (
          <>
            <PageHeader
              breadcrumbs={[
                { label: 'I miei prodotti', to: '/prodotti' },
                { label: product.name },
              ]}
              title={product.name}
              subtitle={`${product.brand} · ${product.category} · ${others.length} altri venditori su questa scheda`}
              actions={[
                <Button
                  key="report"
                  startIcon={<FlagIcon />}
                  onClick={() =>
                    setReportTarget({
                      type: 'product',
                      id: product.id,
                      ownerStoreId: product.createdByStoreId,
                      label: `${product.brand} — ${product.name}`,
                    })
                  }
                  disabled={product.createdByStoreId === store.id}
                >
                  Segnala scheda
                </Button>,
                draft.status === 'published' ? (
                  <Button key="pause" variant="outlined" onClick={unpublish}>
                    Sospendi
                  </Button>
                ) : (
                  <Button key="publish" variant="contained" onClick={publish}>
                    Pubblica
                  </Button>
                ),
              ]}
            />

            <Card sx={{ mb: 3, p: 2 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                divider={<Divider orientation="vertical" flexItem />}
                alignItems={{ md: 'center' }}
              >
                <Chip
                  label={
                    draft.status === 'published' ? 'Online' : draft.status === 'paused' ? 'Sospeso' : 'Bozza'
                  }
                  color={draft.status === 'published' ? 'success' : draft.status === 'paused' ? 'default' : 'warning'}
                />
                <Labeled label="Disponibilità">
                  <Chip size="small" label={avail.label} color={avail.color} variant="outlined" />
                </Labeled>
                <Labeled label="Prezzo di partenza">
                  {from ? formatPrice(from, draft.pricing.currency) : 'da definire'}
                </Labeled>
                <Labeled label="Foto in scheda">{(draft.images || []).length}</Labeled>
                <Labeled label="Servizi attivi">
                  {(draft.services || []).filter((s) => s.enabled).length}
                </Labeled>
                <Box sx={{ flex: 1 }} />
                <SaveIndicator state={saveState} />
              </Stack>
            </Card>

            <Tabs
              value={tab}
              onChange={(_e, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            >
              {TABS.map((t) => (
                <Tab key={t.value} value={t.value} label={t.label} />
              ))}
            </Tabs>

            {tab === 'disponibilita' && (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <SectionCard title="Come vendi questo prodotto">
                    <AvailabilityEditor
                      value={draft.availability}
                      onChange={(availability) => update({ availability })}
                    />
                  </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                  <Stack spacing={3}>
                    <SectionCard title="Codice interno" dense>
                      <TextField
                        fullWidth
                        label="SKU / codice articolo"
                        value={draft.sku || ''}
                        onChange={(e) => update({ sku: e.target.value })}
                        helperText="Serve solo a te, non è visibile al compratore."
                      />
                    </SectionCard>
                    <OtherSellers others={others} />
                  </Stack>
                </Grid>
              </Grid>
            )}

            {tab === 'foto' && (
              <SectionCard>
                <ImageManager
                  productId={productId}
                  storeId={store.id}
                  value={draft.images || []}
                  onChange={(images) => update({ images })}
                  onReport={(image) =>
                    setReportTarget({
                      type: 'image',
                      id: image.id,
                      ownerStoreId: image.ownerStoreId,
                      label: `${image.caption || 'Foto senza didascalia'} · ${image.ownerStoreName}`,
                    })
                  }
                  onRequestPermission={(image) =>
                    setPermissionRequest({
                      productId,
                      productName: product.name,
                      ownerStoreId: image.ownerStoreId,
                      ownerStoreName: image.ownerStoreName,
                      defaultScopes: ['images'],
                    })
                  }
                />
              </SectionCard>
            )}

            {tab === 'caratteristiche' && (
              <SectionCard>
                <CharacteristicsEditor
                  value={draft.characteristics}
                  onChange={(characteristics) => update({ characteristics })}
                />
              </SectionCard>
            )}

            {tab === 'listino' && (
              <SectionCard>
                <PriceTableEditor
                  value={draft.pricing}
                  onChange={(pricing) => update({ pricing })}
                  importOptions={importOptions}
                />
              </SectionCard>
            )}

            {tab === 'servizi' && (
              <SectionCard>
                <ServicesEditor
                  value={draft.services}
                  onChange={(services) => update({ services })}
                  referencePrice={from}
                />
              </SectionCard>
            )}

            {tab === 'pubblicazione' && (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <SectionCard
                    title="Pronto per il marketplace?"
                    description="I punti obbligatori devono essere completi perché il prodotto compaia nel catalogo pubblico."
                  >
                    <List disablePadding>
                      {checks.map((check) => (
                        <ListItem key={check.label} disableGutters>
                          <ListItemIcon sx={{ minWidth: 38 }}>
                            {check.ok ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <ErrorIcon color={check.required ? 'error' : 'disabled'} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={check.label}
                            secondary={check.hint}
                            primaryTypographyProps={{ fontWeight: check.ok ? 400 : 600 }}
                          />
                          {!check.ok && (
                            <Button size="small" onClick={() => setTab(check.tab)}>
                              Vai
                            </Button>
                          )}
                        </ListItem>
                      ))}
                    </List>

                    <Divider sx={{ my: 2 }} />

                    {blocking.length === 0 ? (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        Tutto pronto. Pubblicando, la tua offerta comparirà fra i venditori di questo
                        prodotto per le aree che copri.
                      </Alert>
                    ) : (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Mancano {blocking.length} elementi obbligatori.
                      </Alert>
                    )}

                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" onClick={publish} disabled={blocking.length > 0}>
                        {draft.status === 'published' ? 'Aggiorna la pubblicazione' : 'Pubblica'}
                      </Button>
                      <Button onClick={() => navigate('/prodotti')}>Torna ai prodotti</Button>
                    </Stack>
                  </SectionCard>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                  <SectionCard title="Anteprima della card" dense>
                    <PreviewCard product={product} draft={draft} store={store} />
                  </SectionCard>
                </Grid>
              </Grid>
            )}

            <ReportDialog
              open={Boolean(reportTarget)}
              target={reportTarget}
              reporterStoreId={store.id}
              onClose={() => setReportTarget(null)}
            />
            <PermissionDialog
              open={Boolean(permissionRequest)}
              request={permissionRequest}
              requesterStoreId={store.id}
              onClose={() => setPermissionRequest(null)}
            />
          </>
        )
      }}
    </AsyncBlock>
  )
}

function SaveIndicator({ state }) {
  if (state === 'saving')
    return (
      <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
        <CircularProgress size={14} />
        <Typography variant="caption">Salvataggio…</Typography>
      </Stack>
    )
  if (state === 'saved')
    return (
      <Stack direction="row" spacing={1} alignItems="center" color="success.main">
        <CloudDoneIcon fontSize="small" />
        <Typography variant="caption">Salvato</Typography>
      </Stack>
    )
  return (
    <Typography variant="caption" color="text.secondary">
      Le modifiche si salvano da sole
    </Typography>
  )
}

function OtherSellers({ others }) {
  return (
    <SectionCard
      title="Altri venditori"
      description="Chi altro propone questo prodotto sul marketplace."
      dense
    >
      {others.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Per ora sei l&apos;unico venditore di questa scheda.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {others.map((l) => {
            const avail = availabilityLabel(l.availability)
            const from = priceFrom(l.pricing)
            return (
              <Stack key={l.storeId} direction="row" spacing={1.5} alignItems="center">
                <Avatar variant="rounded" src={l.store?.logoUrl} sx={{ width: 34, height: 34 }}>
                  <StorefrontIcon fontSize="small" />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap>
                    {l.store?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {l.store?.city} · {avail.label}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {from ? formatPrice(from) : '—'}
                </Typography>
              </Stack>
            )
          })}
        </Stack>
      )}
    </SectionCard>
  )
}

function PreviewCard({ product, draft, store }) {
  const cover = (draft.images || []).find((i) => i.role === 'cover')
  const from = priceFrom(draft.pricing)
  const avail = availabilityLabel(draft.availability)
  return (
    <Card variant="outlined" sx={{ maxWidth: 320 }}>
      <Box sx={{ aspectRatio: '4/3', bgcolor: 'action.hover' }}>
        {cover ? (
          <PreviewImage imageId={cover.imageId} productId={product.id} storeId={store.id} />
        ) : (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
            <Typography variant="caption" color="text.secondary">
              Manca la copertina
            </Typography>
          </Stack>
        )}
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          {product.brand}
        </Typography>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {product.name}
        </Typography>
        <Chip size="small" label={avail.label} color={avail.color} variant="outlined" />
        <Typography variant="h3" sx={{ mt: 1.5 }}>
          {from ? `da ${formatPrice(from, draft.pricing.currency)}` : '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {store.name} · {store.city}
        </Typography>
      </Box>
    </Card>
  )
}

function PreviewImage({ imageId, productId, storeId }) {
  const images = useResource(() => api.listProductImages(productId, storeId), [productId, storeId])
  const image = (images.data || []).find((i) => i.id === imageId)
  if (!image) return null
  return (
    <Box
      component="img"
      src={image.coverUrl}
      alt=""
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  )
}

/** Requisiti minimi perché una proposta possa comparire nel catalogo pubblico. */
function buildChecklist(draft) {
  const from = priceFrom(draft.pricing)
  const cover = (draft.images || []).some((i) => i.role === 'cover')
  const left = daysLeft(draft.availability?.resellerTo)
  const availabilityOk =
    draft.availability?.mode === 'stock'
      ? Number(draft.availability.stockQty) > 0
      : !draft.availability?.resellerTo || left === null || left >= 0

  return [
    {
      label: 'Disponibilità impostata',
      hint:
        draft.availability?.mode === 'stock'
          ? 'Servono pezzi a magazzino oppure il passaggio a rivenditore'
          : "L'accordo da rivenditore non deve essere scaduto",
      ok: availabilityOk,
      required: true,
      tab: 'disponibilita',
    },
    {
      label: 'Foto di copertina scelta',
      hint: 'È la miniatura che il compratore vede nel catalogo',
      ok: cover,
      required: true,
      tab: 'foto',
    },
    {
      label: 'Listino valorizzato',
      hint: 'Almeno un prezzo maggiore di zero',
      ok: Boolean(from),
      required: true,
      tab: 'listino',
    },
    {
      label: 'Materiali indicati',
      hint: 'Aiuta il compratore a filtrare e riduce le domande',
      ok: (draft.characteristics?.materials || []).some((m) => m.name),
      required: false,
      tab: 'caratteristiche',
    },
    {
      label: 'Almeno un servizio attivo',
      hint: 'Montaggio o consegna aumentano la conversione',
      ok: (draft.services || []).some((s) => s.enabled),
      required: false,
      tab: 'servizi',
    },
    {
      label: 'Galleria con più foto',
      hint: 'Tre o più foto rendono la scheda credibile',
      ok: (draft.images || []).length >= 3,
      required: false,
      tab: 'foto',
    },
  ]
}
