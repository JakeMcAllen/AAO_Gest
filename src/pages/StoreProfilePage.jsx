import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SaveIcon from '@mui/icons-material/SaveOutlined'

import { api } from '../api/client.js'
import { AreaPicker } from '../components/AreaPicker.jsx'
import { DeliveryCalendarEditor, SellerServicesEditor } from '../components/SellerCapabilities.jsx'
import { Labeled, PageHeader, SectionCard } from '../components/ui.jsx'
import { REGIONS, REGION_NAMES, coordsOfCity } from '../data/geo.js'
import { sellerDeliveryOf, sellerServicesOf, slugify } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'

const FIELDS = [
  'name',
  'tagline',
  'description',
  'email',
  'phone',
  'address',
  'postalCode',
  'region',
  'city',
  'responseHours',
  'areas',
  'services',
  'delivery',
]

export function StoreProfilePage() {
  const { store, refreshStore } = useSession()
  const toast = useToast()
  const [form, setForm] = useState(() => pick(store))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(pick(store))
  }, [store])

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(pick(store)), [form, store])

  const coveredCities = useMemo(() => {
    const set = new Set()
    ;(form.areas || []).forEach((area) => {
      if (area.type === 'region') (REGIONS[area.name] || []).forEach((c) => set.add(c))
      else set.add(area.name)
    })
    return [...set].sort()
  }, [form.areas])

  const set = (key) => (event) => {
    const value = event?.target ? event.target.value : event
    setForm((prev) => (key === 'region' ? { ...prev, region: value, city: '' } : { ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.updateStore(store.id, {
        ...form,
        slug: slugify(form.name),
        // La città posiziona il negozio sulla mappa del sito pubblico: si
        // ricava qui, così il venditore non deve conoscere le sue coordinate.
        coordinates: coordsOfCity(form.city),
      })
      await refreshStore()
      toast.success('Profilo del negozio aggiornato')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Profilo del negozio"
        subtitle="Quello che il compratore vede della tua attività e le zone in cui operi."
        actions={[
          <Button
            key="save"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!dirty || saving}
            onClick={save}
          >
            {dirty ? 'Salva modifiche' : 'Nessuna modifica'}
          </Button>,
        ]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <SectionCard title="Identità" description="Nome, slogan e presentazione della vetrina pubblica.">
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Nome" value={form.name} onChange={set('name')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Indirizzo pubblico"
                    value={`/stores/${slugify(form.name)}`}
                    disabled
                    helperText="Generato dal nome"
                  />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth label="Slogan" value={form.tagline} onChange={set('tagline')} />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="Descrizione"
                    value={form.description}
                    onChange={set('description')}
                    inputProps={{ maxLength: 600 }}
                    helperText={`${(form.description || '').length}/600`}
                  />
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard title="Contatti e sede">
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Email" value={form.email} onChange={set('email')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Telefono" value={form.phone} onChange={set('phone')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField fullWidth label="Indirizzo" value={form.address} onChange={set('address')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth label="CAP" value={form.postalCode} onChange={set('postalCode')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth label="Regione" value={form.region} onChange={set('region')}>
                    {REGION_NAMES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Città"
                    value={form.city}
                    onChange={set('city')}
                    disabled={!form.region}
                  >
                    {(REGIONS[form.region] || []).map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Ore per rispondere"
                    value={form.responseHours}
                    onChange={(e) => setForm((p) => ({ ...p, responseHours: Number(e.target.value) }))}
                    helperText="Dichiarato al compratore"
                  />
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard
              title="Aree di operatività"
              description="Città e regioni in cui consegni e monti. Il marketplace propone al compratore il negozio più vicino fra quelli che coprono la sua città."
            >
              <Stack spacing={2}>
                <AreaPicker value={form.areas || []} onChange={(areas) => setForm((p) => ({ ...p, areas }))} />
                {coveredCities.length > 0 && (
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      {coveredCities.length} città raggiunte
                    </Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {coveredCities.slice(0, 24).map((c) => (
                        <Chip key={c} size="small" label={c} variant="outlined" />
                      ))}
                      {coveredCities.length > 24 && (
                        <Chip size="small" label={`+${coveredCities.length - 24}`} />
                      )}
                    </Stack>
                  </Box>
                )}
                {!form.areas?.length && (
                  <Alert severity="warning">
                    Senza aree il tuo negozio non viene proposto a nessun compratore.
                  </Alert>
                )}
              </Stack>
            </SectionCard>

            <SectionCard
              title="Trasporto, montaggio e altri servizi"
              description="Cosa sai fare oltre a vendere il mobile. Il compratore li vede accanto al tuo nome quando sceglie il venditore, e può chiederteli al momento dell'ordine."
            >
              <SellerServicesEditor
                value={form.services || []}
                onChange={(services) => setForm((p) => ({ ...p, services }))}
              />
            </SectionCard>

            <SectionCard
              title="Quando consegni"
              description="Il calendario che il compratore vede al momento dell'acquisto: può scegliere solo fra le date che tu accetti."
            >
              <DeliveryCalendarEditor
                value={form.delivery}
                onChange={(delivery) => setForm((p) => ({ ...p, delivery }))}
              />
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3} sx={{ position: 'sticky', top: 88 }}>
            <SectionCard title="Anteprima vetrina" dense>
              <Box
                sx={{
                  height: 120,
                  bgcolor: 'action.hover',
                  backgroundImage: store.coverUrl ? `url(${store.coverUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  mb: -4,
                }}
              />
              <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ px: 1 }}>
                <Avatar
                  variant="rounded"
                  src={store.logoUrl}
                  sx={{ width: 64, height: 64, border: 3, borderColor: 'background.paper' }}
                >
                  {form.name?.[0]}
                </Avatar>
                <Box sx={{ pb: 0.5, minWidth: 0 }}>
                  <Typography variant="h4" noWrap>
                    {form.name || 'Nome del negozio'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {form.tagline || 'Slogan'}
                  </Typography>
                </Box>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 2,
                  px: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {form.description}
              </Typography>
            </SectionCard>

            <SectionCard title="Dati sincronizzati" dense>
              <Stack spacing={1.5}>
                <Labeled label="Identificativo">
                  <code>{store.id}</code>
                </Labeled>
                <Labeled label="Sede">
                  {[form.address, form.postalCode, form.city].filter(Boolean).join(', ')}
                </Labeled>
                <Labeled label="Aree">{(form.areas || []).length}</Labeled>
                <Typography variant="caption" color="text.secondary">
                  Il profilo è la stessa entità che il sito pubblico legge dalla tabella dei negozi.
                </Typography>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </>
  )
}

function pick(store) {
  const out = {}
  FIELDS.forEach((f) => {
    out[f] = store?.[f] ?? (f === 'areas' ? [] : '')
  })
  // Servizi e calendario passano dai default di dominio, cosi' un negozio
  // aperto prima che esistessero apre comunque il modulo compilato.
  out.services = sellerServicesOf(store)
  out.delivery = sellerDeliveryOf(store)
  return out
}
