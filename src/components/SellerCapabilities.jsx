import { useMemo } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined'

import {
  PRICE_MODES,
  SELLER_SERVICES,
  WEEKDAYS,
  firstDeliverableDate,
  formatDate,
} from '../domain.js'

/**
 * Servizi e calendario di consegna del NEGOZIO.
 *
 * Non è la configurazione della singola proposta di vendita: è la promessa di
 * base che il sito pubblico usa per capire chi può servire un compratore e in
 * che date. Per questo ogni riquadro chiude con la frase che il compratore
 * leggerà, come nel resto del gestionale.
 */

export function SellerServicesEditor({ value = [], onChange }) {
  const set = (type, patch) =>
    onChange(value.map((s) => (s.type === type ? { ...s, ...patch } : s)))

  const active = value.filter((s) => s.enabled)

  return (
    <Stack spacing={2}>
      {SELLER_SERVICES.map((def) => {
        const service = value.find((s) => s.type === def.type) || { type: def.type, enabled: false }
        return (
          <Box
            key={def.type}
            sx={{
              border: 1,
              borderColor: service.enabled ? 'primary.main' : 'divider',
              p: 2,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Switch
                checked={!!service.enabled}
                onChange={(e) => set(def.type, { enabled: e.target.checked })}
                inputProps={{ 'aria-label': def.label }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2">{def.label}</Typography>
                  {def.logistic && (
                    <Chip size="small" variant="outlined" label="incide sulla consegna" />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {def.description}
                </Typography>

                {service.enabled && (
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Come lo fai pagare"
                        value={service.priceMode || 'quote'}
                        onChange={(e) => set(def.type, { priceMode: e.target.value })}
                      >
                        {PRICE_MODES.map((m) => (
                          <MenuItem key={m.value} value={m.value}>
                            {m.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    {service.priceMode !== 'quote' && service.priceMode !== 'free' && (
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label={service.priceMode === 'percent' ? 'Percentuale' : 'Importo'}
                          value={service.price ?? 0}
                          onChange={(e) => set(def.type, { price: Number(e.target.value) || 0 })}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  {service.priceMode === 'percent' ? '%' : '€'}
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      </Grid>
                    )}
                    {service.priceMode === 'per_unit' && (
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Per ogni"
                          placeholder="km, piano, m²"
                          value={service.unit || ''}
                          onChange={(e) => set(def.type, { unit: e.target.value })}
                        />
                      </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nota per il compratore"
                        placeholder="Es. montaggio incluso solo al piano terra"
                        value={service.notes || ''}
                        onChange={(e) => set(def.type, { notes: e.target.value })}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Stack>
          </Box>
        )
      })}

      {active.length === 0 ? (
        <Alert severity="warning">
          Senza servizi attivi il compratore non sa se puoi consegnare o montare: comparirai
          in fondo all'elenco dei venditori.
        </Alert>
      ) : (
        <Alert severity="info">
          Sulla scheda prodotto il compratore leggerà:{' '}
          <strong>{active.map((s) => SELLER_SERVICES.find((d) => d.type === s.type)?.label).join(' · ')}</strong>
        </Alert>
      )}
    </Stack>
  )
}

export function DeliveryCalendarEditor({ value, onChange }) {
  const delivery = value || {}
  const set = (patch) => onChange({ ...delivery, ...patch })

  const weekdays = delivery.weekdays || []
  const blackout = delivery.blackoutDates || []

  const preview = useMemo(() => firstDeliverableDate(delivery), [delivery])

  function addBlackout(date) {
    if (!date || blackout.includes(date)) return
    set({ blackoutDates: [...blackout, date].sort() })
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Giorni in cui consegni
        </Typography>
        <ToggleButtonGroup
          value={weekdays}
          onChange={(_e, next) => set({ weekdays: next })}
          size="small"
          sx={{ mt: 0.5, flexWrap: 'wrap' }}
        >
          {WEEKDAYS.map((d) => (
            <ToggleButton key={d.value} value={d.value} sx={{ px: 1.8 }}>
              {d.short}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {weekdays.length === 0 && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Nessun giorno selezionato: non potresti ricevere alcun ordine.
          </Alert>
        )}
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Preavviso"
            helperText="Giorni fra l'ordine e la prima consegna possibile"
            value={delivery.leadTimeDays ?? 21}
            onChange={(e) => set({ leadTimeDays: Math.max(0, Number(e.target.value) || 0) })}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">gg</InputAdornment> } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Consegne al giorno"
            helperText="Quante ne regge la squadra"
            value={delivery.slotsPerDay ?? 3}
            onChange={(e) => set({ slotsPerDay: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Prenotabile fino a"
            helperText="Quanto in là accetti date"
            value={delivery.horizonDays ?? 120}
            onChange={(e) => set({ horizonDays: Math.max(7, Number(e.target.value) || 7) })}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">gg</InputAdornment> } }}
          />
        </Grid>
      </Grid>

      <Divider />

      <Box>
        <Typography variant="overline" color="text.secondary">
          Chiusure
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Ferie e giorni di fermo: in queste date non ti viene proposta nessuna consegna.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <TextField
            size="small"
            type="date"
            label="Aggiungi chiusura"
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(e) => {
              addBlackout(e.target.value)
              e.target.value = ''
            }}
          />
        </Stack>
        {blackout.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nessuna chiusura programmata.
          </Typography>
        ) : (
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {blackout.map((d) => (
              <Chip
                key={d}
                size="small"
                icon={<EventBusyIcon />}
                label={formatDate(d)}
                onDelete={() => set({ blackoutDates: blackout.filter((x) => x !== d) })}
                deleteIcon={<DeleteIcon />}
                variant="outlined"
              />
            ))}
          </Stack>
        )}
      </Box>

      <TextField
        fullWidth
        size="small"
        label="Nota sulla consegna"
        placeholder="Es. consegniamo al mattino, chiamiamo il giorno prima"
        value={delivery.note || ''}
        onChange={(e) => set({ note: e.target.value })}
      />

      {/* La conseguenza, scritta dove si decide. */}
      <Alert severity={preview ? 'info' : 'error'}>
        {preview ? (
          <>
            Chi ordina oggi si vedrà proporre <strong>{formatDate(preview)}</strong> come prima
            data utile.
          </>
        ) : (
          'Con queste regole non esiste nessuna data consegnabile.'
        )}
      </Alert>
    </Stack>
  )
}
