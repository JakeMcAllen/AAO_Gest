import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid2'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined'

import { availabilityLabel, daysLeft } from '../domain.js'

const MODES = [
  {
    value: 'stock',
    icon: <Inventory2Icon />,
    title: 'Pezzi in magazzino',
    description:
      'Vendi quello che hai fisicamente in negozio o a magazzino. La quantità scala a ogni ordine e sotto la soglia ti avvisiamo.',
  },
  {
    value: 'reseller',
    icon: <AllInclusiveIcon />,
    title: 'Rivenditore autorizzato',
    description:
      'Hai un accordo con il produttore: per tutta la durata la disponibilità è illimitata e conta solo il tempo di consegna.',
  },
]

/**
 * Le due economie del venditore di mobili: chi tiene stock e chi rivende su
 * ordine. Sono modelli diversi, quindi la scelta viene prima ed è esplicita.
 */
export function AvailabilityEditor({ value, onChange }) {
  const set = (key) => (event) => {
    const raw = event?.target ? event.target.value : event
    onChange({ ...value, [key]: raw })
  }
  const setNumber = (key) => (event) =>
    onChange({ ...value, [key]: event.target.value === '' ? '' : Number(event.target.value) })

  const summary = availabilityLabel(value)
  const left = daysLeft(value.resellerTo)

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        {MODES.map((mode) => {
          const active = value.mode === mode.value
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={mode.value}>
              <Card
                onClick={() => onChange({ ...value, mode: mode.value })}
                role="radio"
                aria-checked={active}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onChange({ ...value, mode: mode.value })
                }}
                sx={{
                  p: 2.5,
                  height: '100%',
                  cursor: 'pointer',
                  borderColor: active ? 'primary.main' : 'divider',
                  borderWidth: active ? 2 : 1,
                  bgcolor: active ? 'action.selected' : 'background.paper',
                  transition: 'border-color .15s',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ color: active ? 'primary.main' : 'text.secondary', display: 'flex' }}>
                    {mode.icon}
                  </Box>
                  <Typography variant="h4">{mode.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {mode.description}
                </Typography>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {value.mode === 'stock' ? (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Pezzi disponibili"
              value={value.stockQty}
              onChange={setNumber('stockQty')}
              inputProps={{ min: 0 }}
              InputProps={{ endAdornment: <InputAdornment position="end">pz</InputAdornment> }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Soglia di riordino"
              value={value.lowStockThreshold}
              onChange={setNumber('lowStockThreshold')}
              inputProps={{ min: 0 }}
              helperText="Sotto questo numero compare l'avviso in panoramica"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Giorni di consegna"
              value={value.leadTimeDays}
              onChange={setNumber('leadTimeDays')}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Nota interna"
              value={value.note}
              onChange={set('note')}
              placeholder="Es. 2 pezzi esposti in showroom, 1 in deposito"
            />
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="date"
              label="Accordo attivo dal"
              value={value.resellerFrom || ''}
              onChange={set('resellerFrom')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="date"
              label="Fino al"
              value={value.resellerTo || ''}
              onChange={set('resellerTo')}
              InputLabelProps={{ shrink: true }}
              helperText={
                left === null || value.resellerTo === ''
                  ? 'Lascia vuoto per un accordo senza scadenza'
                  : left < 0
                    ? `Scaduto da ${Math.abs(left)} giorni`
                    : `Mancano ${left} giorni`
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Giorni di consegna"
              value={value.leadTimeDays}
              onChange={setNumber('leadTimeDays')}
              inputProps={{ min: 0 }}
              helperText="Tempo dichiarato al compratore"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Riferimento dell'accordo"
              value={value.note}
              onChange={set('note')}
              placeholder="Es. contratto di rivendita n. 2024/118 con il produttore"
            />
          </Grid>
        </Grid>
      )}

      <Alert severity={summary.color === 'success' ? 'success' : summary.color === 'default' ? 'info' : summary.color}>
        Sul sito pubblico il compratore leggerà: <strong>{summary.label}</strong>
        {value.leadTimeDays ? ` · consegna in ${value.leadTimeDays} giorni` : ''}
      </Alert>
    </Stack>
  )
}
