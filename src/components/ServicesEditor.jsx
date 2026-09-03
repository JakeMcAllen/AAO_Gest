import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { PRICE_MODES, SERVICE_CATALOG, formatPrice } from '../domain.js'

/**
 * Servizi accessori che il negozio vende insieme al prodotto (montaggio,
 * consegna, rilievo, ritiro dell'usato, garanzia estesa). Ognuno ha un proprio
 * criterio di prezzo: fisso, percentuale, a unità, su preventivo o incluso.
 */
export function ServicesEditor({ value = [], onChange, referencePrice }) {
  const update = (type, patch) =>
    onChange(value.map((s) => (s.type === type ? { ...s, ...patch } : s)))

  const activeCount = value.filter((s) => s.enabled).length

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4">Servizi offerti</Typography>
          <Typography variant="body2" color="text.secondary">
            Compaiono come opzioni nella richiesta di preventivo, con il loro costo.
          </Typography>
        </Box>
        <Chip
          label={`${activeCount} attivi su ${value.length}`}
          color={activeCount ? 'primary' : 'default'}
          variant="outlined"
        />
      </Stack>

      {SERVICE_CATALOG.map((definition) => {
        const service = value.find((s) => s.type === definition.type) || { type: definition.type }
        const mode = PRICE_MODES.find((m) => m.value === service.priceMode)
        return (
          <Card key={definition.type} variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ p: 2, bgcolor: service.enabled ? 'action.hover' : 'transparent' }}
            >
              <Switch
                checked={Boolean(service.enabled)}
                onChange={(e) => update(definition.type, { enabled: e.target.checked })}
                inputProps={{ 'aria-label': definition.label }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">{definition.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {definition.description}
                </Typography>
              </Box>
              {service.enabled && (
                <Chip size="small" label={describe(service, referencePrice)} color="primary" variant="outlined" />
              )}
            </Stack>

            <Collapse in={Boolean(service.enabled)} unmountOnExit>
              <Divider />
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Criterio di prezzo"
                      value={service.priceMode || 'fixed'}
                      onChange={(e) => update(definition.type, { priceMode: e.target.value })}
                      helperText={mode?.hint}
                    >
                      {PRICE_MODES.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {['fixed', 'percent', 'per_unit'].includes(service.priceMode) && (
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Importo"
                        value={service.price ?? 0}
                        onChange={(e) => update(definition.type, { price: Number(e.target.value) })}
                        InputProps={{
                          startAdornment:
                            service.priceMode === 'percent' ? undefined : (
                              <InputAdornment position="start">€</InputAdornment>
                            ),
                          endAdornment:
                            service.priceMode === 'percent' ? (
                              <InputAdornment position="end">%</InputAdornment>
                            ) : undefined,
                        }}
                      />
                    </Grid>
                  )}

                  {service.priceMode === 'per_unit' && (
                    <Grid size={{ xs: 6, sm: 2 }}>
                      <TextField
                        select
                        fullWidth
                        label="Per"
                        value={service.unit || 'km'}
                        onChange={(e) => update(definition.type, { unit: e.target.value })}
                      >
                        {['km', 'piano', 'm²', 'pezzo', 'ora'].map((u) => (
                          <MenuItem key={u} value={u}>
                            {u}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Giorni di attesa"
                      value={service.leadTimeDays ?? 0}
                      onChange={(e) => update(definition.type, { leadTimeDays: Number(e.target.value) })}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Condizioni"
                      placeholder="Es. gratuito entro 20 km, poi 2,50 €/km"
                      value={service.notes || ''}
                      onChange={(e) => update(definition.type, { notes: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Card>
        )
      })}

      {activeCount === 0 && (
        <Alert severity="info">
          Nessun servizio attivo: il compratore vedrà solo il prodotto. Attivare almeno consegna e
          montaggio aumenta la completezza dell&apos;offerta.
        </Alert>
      )}
    </Stack>
  )
}

function describe(service, referencePrice) {
  switch (service.priceMode) {
    case 'free':
      return 'Incluso'
    case 'quote':
      return 'Su preventivo'
    case 'percent': {
      const pct = `${service.price || 0}%`
      return referencePrice
        ? `${pct} ≈ ${formatPrice((referencePrice * (service.price || 0)) / 100)}`
        : pct
    }
    case 'per_unit':
      return `${formatPrice(service.price)} / ${service.unit || 'unità'}`
    default:
      return formatPrice(service.price)
  }
}
