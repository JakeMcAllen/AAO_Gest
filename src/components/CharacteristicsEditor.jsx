import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'

import { CUSTOMIZATION_TYPES, FINISHES, MATERIALS, formatPrice } from '../domain.js'
import { EmptyState } from './ui.jsx'

/**
 * Caratteristiche dell'offerta: in quali materiali il negozio vende il prodotto
 * e quali personalizzazioni accetta. Sono dati del venditore, non del catalogo:
 * due negozi possono vendere lo stesso divano con finiture diverse.
 */
export function CharacteristicsEditor({ value, onChange }) {
  const materials = value?.materials || []
  const customizations = value?.customizations || []

  const setMaterials = (next) => onChange({ ...value, materials: next })
  const setCustomizations = (next) => onChange({ ...value, customizations: next })

  const updateMaterial = (index, patch) =>
    setMaterials(materials.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  const updateCustom = (index, patch) =>
    setCustomizations(customizations.map((c, i) => (i === index ? { ...c, ...patch } : c)))

  return (
    <Stack spacing={4}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h4">Materiali e finiture</Typography>
            <Typography variant="body2" color="text.secondary">
              In quali versioni vendi questo prodotto. Il sovrapprezzo si somma al prezzo di listino.
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setMaterials([...materials, { name: '', finish: '', surcharge: 0 }])}
          >
            Aggiungi materiale
          </Button>
        </Stack>

        {materials.length === 0 ? (
          <Card variant="outlined" sx={{ borderStyle: 'dashed' }}>
            <EmptyState
              compact
              title="Nessun materiale indicato"
              description="Senza materiali il compratore vede solo la versione standard del produttore."
            />
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {materials.map((material, index) => (
              <Card key={index} variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Autocomplete
                      freeSolo
                      options={MATERIALS}
                      value={material.name}
                      onInputChange={(_e, v) => updateMaterial(index, { name: v })}
                      renderInput={(params) => (
                        <TextField {...params} label="Materiale" placeholder="Es. Rovere massello" />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Autocomplete
                      freeSolo
                      options={FINISHES}
                      value={material.finish}
                      onInputChange={(_e, v) => updateMaterial(index, { finish: v })}
                      renderInput={(params) => <TextField {...params} label="Finitura" />}
                    />
                  </Grid>
                  <Grid size={{ xs: 9, md: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Sovrapprezzo"
                      value={material.surcharge}
                      onChange={(e) => updateMaterial(index, { surcharge: Number(e.target.value) })}
                      InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 3, md: 1 }} sx={{ textAlign: 'right' }}>
                    <Tooltip title="Rimuovi">
                      <IconButton onClick={() => setMaterials(materials.filter((_, i) => i !== index))}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h4">Personalizzazioni</Typography>
            <Typography variant="body2" color="text.secondary">
              Cosa può scegliere il compratore in fase di richiesta preventivo.
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              setCustomizations([
                ...customizations,
                { name: '', type: 'choice', options: [], price: 0, required: false },
              ])
            }
          >
            Aggiungi personalizzazione
          </Button>
        </Stack>

        {customizations.length === 0 ? (
          <Card variant="outlined" sx={{ borderStyle: 'dashed' }}>
            <EmptyState
              compact
              title="Nessuna personalizzazione"
              description="Il prodotto viene proposto così com'è, senza opzioni configurabili."
            />
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {customizations.map((custom, index) => {
              const type = CUSTOMIZATION_TYPES.find((t) => t.value === custom.type)
              return (
                <Card key={index} variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Nome"
                        placeholder="Es. Colore rivestimento"
                        value={custom.name}
                        onChange={(e) => updateCustom(index, { name: e.target.value })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        select
                        fullWidth
                        label="Tipo"
                        value={custom.type}
                        onChange={(e) => updateCustom(index, { type: e.target.value, options: [] })}
                        helperText={type?.hint}
                      >
                        {CUSTOMIZATION_TYPES.map((t) => (
                          <MenuItem key={t.value} value={t.value}>
                            {t.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 8, md: 3 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Supplemento"
                        value={custom.price}
                        onChange={(e) => updateCustom(index, { price: Number(e.target.value) })}
                        InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
                        helperText={custom.price ? `+${formatPrice(custom.price)} sul totale` : 'Incluso'}
                      />
                    </Grid>
                    <Grid size={{ xs: 4, md: 2 }} sx={{ textAlign: 'right' }}>
                      <Tooltip title="Rimuovi">
                        <IconButton
                          onClick={() => setCustomizations(customizations.filter((_, i) => i !== index))}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>

                    {custom.type === 'choice' && (
                      <Grid size={12}>
                        <Autocomplete
                          multiple
                          freeSolo
                          options={[]}
                          value={custom.options || []}
                          onChange={(_e, v) => updateCustom(index, { options: v })}
                          renderTags={(tags, getTagProps) =>
                            tags.map((option, i) => {
                              const { key, ...rest } = getTagProps({ index: i })
                              return <Chip key={key} {...rest} size="small" label={option} />
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Opzioni selezionabili"
                              placeholder="Scrivi e premi Invio"
                              helperText="Es. Écru, Sabbia, Verde salvia"
                            />
                          )}
                        />
                      </Grid>
                    )}

                    <Grid size={12}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Switch
                          checked={Boolean(custom.required)}
                          onChange={(e) => updateCustom(index, { required: e.target.checked })}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Scelta obbligatoria per completare la richiesta
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
