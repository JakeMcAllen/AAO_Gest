import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LocationCityIcon from '@mui/icons-material/LocationCityOutlined'
import MapIcon from '@mui/icons-material/MapOutlined'

import { AREA_OPTIONS } from '../data/geo.js'

/**
 * Aree di azione del negozio: città singole o regioni intere. Il sito pubblico
 * le confronta con la città del compratore per proporre il venditore più vicino,
 * quindi vale la pena renderle esplicite e facili da comporre.
 */
export function AreaPicker({ value = [], onChange, helperText, error }) {
  const selected = value.map(
    (a) => AREA_OPTIONS.find((o) => o.type === a.type && o.name === a.name) || {
      ...a,
      label: a.name,
    },
  )

  return (
    <Box>
      <Autocomplete
        multiple
        options={AREA_OPTIONS}
        value={selected}
        onChange={(_e, next) =>
          onChange(next.map(({ type, name, region }) => ({ type, name, region })))
        }
        isOptionEqualToValue={(o, v) => o.type === v.type && o.name === v.name}
        groupBy={(o) => (o.type === 'region' ? 'Regioni intere' : o.region)}
        getOptionLabel={(o) => o.label || o.name}
        filterSelectedOptions
        renderOption={(props, option) => {
          const { key, ...rest } = props
          return (
            <li key={key} {...rest}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {option.type === 'region' ? (
                  <MapIcon fontSize="small" color="disabled" />
                ) : (
                  <LocationCityIcon fontSize="small" color="disabled" />
                )}
                <span>{option.type === 'region' ? option.name : option.name}</span>
                {option.type === 'region' && (
                  <Typography variant="caption" color="text.secondary">
                    tutta la regione
                  </Typography>
                )}
              </Stack>
            </li>
          )
        }}
        renderTags={(tags, getTagProps) =>
          tags.map((option, index) => {
            const { key, ...rest } = getTagProps({ index })
            return (
              <Chip
                key={key}
                {...rest}
                size="small"
                color={option.type === 'region' ? 'primary' : 'default'}
                variant={option.type === 'region' ? 'filled' : 'outlined'}
                icon={option.type === 'region' ? <MapIcon /> : <LocationCityIcon />}
                label={option.name}
              />
            )
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Aree di operatività"
            placeholder="Cerca una città o una regione…"
            error={error}
            helperText={helperText || 'Le regioni coprono tutte le loro città. Puoi combinarle.'}
          />
        )}
      />
    </Box>
  )
}
