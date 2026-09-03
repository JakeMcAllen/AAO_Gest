import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid2'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined'
import CheckIcon from '@mui/icons-material/CheckOutlined'

import { AreaPicker } from '../components/AreaPicker.jsx'
import { Labeled } from '../components/ui.jsx'
import { REGIONS, REGION_NAMES } from '../data/geo.js'
import { placeholderImage } from '../api/media.js'
import { slugify } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'

const STEPS = ['Identità', 'Sede e contatti', 'Aree di operatività']

const EMPTY = {
  name: '',
  tagline: '',
  description: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  region: '',
  postalCode: '',
  areas: [],
}

export function StoreWizardPage() {
  const { registerStore } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = (key) => (event) => {
    const value = event?.target ? event.target.value : event
    setForm((prev) => {
      if (key === 'region') return { ...prev, region: value, city: '' }
      return { ...prev, [key]: value }
    })
  }

  const errors = validate(form, step)
  const canContinue = Object.keys(errors).length === 0

  const next = () => {
    setTouched(true)
    if (!canContinue) return
    setTouched(false)
    if (step < STEPS.length - 1) setStep(step + 1)
    else submit()
  }

  const submit = async () => {
    setSaving(true)
    try {
      const store = await registerStore({
        ...form,
        slug: slugify(form.name),
        logoUrl: placeholderImage(form.name, form.name),
        coverUrl: placeholderImage(form.tagline || form.name, `${form.name}-cover`, 2),
      })
      toast.success(`${store.name} è online. Ora aggiungi i tuoi prodotti.`)
      navigate('/prodotti/nuovo')
    } catch (err) {
      toast.error(err.message)
      setSaving(false)
    }
  }

  const err = (key) => (touched && errors[key] ? errors[key] : '')

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 300 }}>allena</Typography>
          <Typography sx={{ letterSpacing: '0.18em', fontWeight: 600, color: 'primary.main' }}>
            ARREDAMENTI
          </Typography>
        </Stack>
        <Typography variant="h1" gutterBottom>
          Apri la tua attività
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 640 }}>
          Tre passaggi: chi siete, dove siete, dove consegnate. Potrai modificare tutto in seguito
          dal profilo del negozio.
        </Typography>

        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          {step === 0 && (
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  autoFocus
                  label="Nome del negozio"
                  value={form.name}
                  onChange={set('name')}
                  error={Boolean(err('name'))}
                  helperText={err('name') || (form.name ? `Indirizzo pubblico: /stores/${slugify(form.name)}` : ' ')}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Slogan"
                  placeholder="Es. Design contemporaneo per la casa"
                  value={form.tagline}
                  onChange={set('tagline')}
                  helperText="Una riga sotto il nome nella vetrina pubblica."
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Descrizione"
                  value={form.description}
                  onChange={set('description')}
                  error={Boolean(err('description'))}
                  helperText={
                    err('description') ||
                    `${form.description.length}/600 · racconta specializzazione, showroom e servizi`
                  }
                  inputProps={{ maxLength: 600 }}
                />
              </Grid>
            </Grid>
          )}

          {step === 1 && (
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  autoFocus
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  error={Boolean(err('email'))}
                  helperText={err('email') || ' '}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Telefono"
                  value={form.phone}
                  onChange={set('phone')}
                  error={Boolean(err('phone'))}
                  helperText={err('phone') || ' '}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth label="Indirizzo" value={form.address} onChange={set('address')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="CAP" value={form.postalCode} onChange={set('postalCode')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Regione"
                  value={form.region}
                  onChange={set('region')}
                  error={Boolean(err('region'))}
                  helperText={err('region') || ' '}
                >
                  {REGION_NAMES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Città"
                  value={form.city}
                  onChange={set('city')}
                  disabled={!form.region}
                  error={Boolean(err('city'))}
                  helperText={err('city') || (form.region ? ' ' : 'Scegli prima la regione')}
                >
                  {(REGIONS[form.region] || []).map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          )}

          {step === 2 && (
            <Stack spacing={3}>
              <Alert severity="info" variant="outlined">
                Le aree decidono a quali compratori vieni proposto: chi cerca da Milano vede prima i
                negozi che coprono Milano.
              </Alert>
              <AreaPicker
                value={form.areas}
                onChange={(areas) => setForm((p) => ({ ...p, areas }))}
                error={Boolean(err('areas'))}
                helperText={err('areas') || undefined}
              />
              {form.region && !form.areas.length && (
                <Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        areas: [
                          { type: 'city', name: p.city, region: p.region },
                          { type: 'region', name: p.region, region: p.region },
                        ].filter((a) => a.name),
                      }))
                    }
                  >
                    Usa {form.city ? `${form.city} e ` : ''}
                    {form.region}
                  </Button>
                </Box>
              )}

              <Card variant="outlined" sx={{ p: 2.5, bgcolor: 'action.hover' }}>
                <Typography variant="h4" gutterBottom>
                  Riepilogo
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Labeled label="Negozio">{form.name || '—'}</Labeled>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Labeled label="Sede">
                      {[form.address, form.city, form.region].filter(Boolean).join(', ') || '—'}
                    </Labeled>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Labeled label="Contatti">
                      {[form.email, form.phone].filter(Boolean).join(' · ') || '—'}
                    </Labeled>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Labeled label="Aree servite">{form.areas.length || 0}</Labeled>
                  </Grid>
                </Grid>
              </Card>
            </Stack>
          )}

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => (step === 0 ? navigate('/accesso') : setStep(step - 1))}
              disabled={saving}
            >
              {step === 0 ? 'Torna all’accesso' : 'Indietro'}
            </Button>
            <Button
              variant="contained"
              size="large"
              endIcon={step === STEPS.length - 1 ? <CheckIcon /> : <ArrowForwardIcon />}
              onClick={next}
              disabled={saving}
            >
              {step === STEPS.length - 1 ? 'Apri il negozio' : 'Continua'}
            </Button>
          </Stack>
        </Card>
      </Container>
    </Box>
  )
}

function validate(form, step) {
  const errors = {}
  if (step === 0) {
    if (form.name.trim().length < 3) errors.name = 'Almeno 3 caratteri'
    if (form.description.trim().length < 30)
      errors.description = 'Servono almeno 30 caratteri: è il testo che legge il compratore'
  }
  if (step === 1) {
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email)) errors.email = 'Email non valida'
    if (form.phone.trim().length < 6) errors.phone = 'Telefono non valido'
    if (!form.region) errors.region = 'Obbligatoria'
    if (!form.city) errors.city = 'Obbligatoria'
  }
  if (step === 2) {
    if (!form.areas.length) errors.areas = 'Indica almeno un’area servita'
  }
  return errors
}
