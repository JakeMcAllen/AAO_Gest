import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DownloadIcon from '@mui/icons-material/SaveAltOutlined'

import { COLUMN_TYPES, PRICE_TEMPLATES, formatPrice, priceFrom } from '../domain.js'
import { ConfirmDialog } from './ui.jsx'

/**
 * Listino del venditore. Si parte da un modello (prezzo unico, fasce di
 * quantità, griglia dimensioni, matrice materiali) oppure da zero definendo le
 * proprie colonne. In ogni caso la struttura salvata è la stessa, così il sito
 * pubblico sa sempre come leggerla.
 */
export function PriceTableEditor({ value, onChange, importOptions = [] }) {
  const [pendingTemplate, setPendingTemplate] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  const columns = value.columns || []
  const rows = value.rows || []
  const isCustom = value.model === 'custom'
  const from = priceFrom(value)

  const set = (patch) => onChange({ ...value, ...patch })

  const applyTemplate = (templateId) => {
    const tpl = PRICE_TEMPLATES.find((t) => t.id === templateId)
    set({
      model: tpl.id,
      columns: tpl.columns.map((c) => ({ ...c })),
      rows: tpl.rows.map((r, i) => ({ id: `r${i + 1}`, ...r })),
    })
  }

  const chooseTemplate = (templateId) => {
    if (templateId === value.model) return
    const hasData = rows.some((row) =>
      columns.some((c) => row[c.key] !== '' && row[c.key] !== 0 && row[c.key] !== undefined),
    )
    if (hasData) setPendingTemplate(templateId)
    else applyTemplate(templateId)
  }

  const updateCell = (rowId, key, raw, type) => {
    const parsed = type === 'text' ? raw : raw === '' ? '' : Number(raw)
    set({ rows: rows.map((r) => (r.id === rowId ? { ...r, [key]: parsed } : r)) })
  }

  const addRow = () => {
    const blank = Object.fromEntries(columns.map((c) => [c.key, c.type === 'text' ? '' : 0]))
    set({ rows: [...rows, { id: `r${Date.now().toString(36)}`, ...blank }] })
  }

  const duplicateRow = (rowId) => {
    const source = rows.find((r) => r.id === rowId)
    const index = rows.findIndex((r) => r.id === rowId)
    const copy = { ...source, id: `r${Date.now().toString(36)}` }
    set({ rows: [...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)] })
  }

  const removeRow = (rowId) => set({ rows: rows.filter((r) => r.id !== rowId) })

  const addColumn = () => {
    const key = `col${Date.now().toString(36)}`
    set({
      columns: [...columns.slice(0, -1), { key, label: 'Nuova colonna', type: 'text' }, columns[columns.length - 1]],
      rows: rows.map((r) => ({ ...r, [key]: '' })),
    })
  }

  const updateColumn = (key, patch) =>
    set({ columns: columns.map((c) => (c.key === key ? { ...c, ...patch } : c)) })

  const removeColumn = (key) => {
    if (columns.length <= 2) return
    set({
      columns: columns.filter((c) => c.key !== key),
      rows: rows.map(({ [key]: _drop, ...rest }) => rest),
    })
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h4">Struttura del listino</Typography>
            <Typography variant="body2" color="text.secondary">
              Scegli il modello più vicino al tuo modo di vendere, poi adattalo.
            </Typography>
          </Box>
          {importOptions.length > 0 && (
            <Button startIcon={<DownloadIcon />} onClick={() => setImportOpen(true)}>
              Importa struttura
            </Button>
          )}
        </Stack>

        <Grid container spacing={1.5}>
          {PRICE_TEMPLATES.map((tpl) => {
            const active = value.model === tpl.id
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={tpl.id}>
                <Card
                  onClick={() => chooseTemplate(tpl.id)}
                  role="radio"
                  aria-checked={active}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') chooseTemplate(tpl.id)
                  }}
                  sx={{
                    p: 2,
                    height: '100%',
                    cursor: 'pointer',
                    borderColor: active ? 'primary.main' : 'divider',
                    borderWidth: active ? 2 : 1,
                    bgcolor: active ? 'action.selected' : 'background.paper',
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {tpl.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tpl.description}
                  </Typography>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            select
            fullWidth
            label="Valuta"
            value={value.currency}
            onChange={(e) => set({ currency: e.target.value })}
          >
            <MenuItem value="EUR">Euro (€)</MenuItem>
            <MenuItem value="CHF">Franco svizzero</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            select
            fullWidth
            label="Unità di vendita"
            value={value.unit}
            onChange={(e) => set({ unit: e.target.value })}
          >
            {['pz', 'm', 'm²', 'set', 'progetto'].map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch checked={value.vatIncluded} onChange={(e) => set({ vatIncluded: e.target.checked })} />
            }
            label={value.vatIncluded ? 'Prezzi IVA inclusa' : 'Prezzi IVA esclusa'}
          />
        </Grid>
      </Grid>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h4">Voci di listino</Typography>
          <Stack direction="row" spacing={1}>
            {isCustom && (
              <Button size="small" startIcon={<AddIcon />} onClick={addColumn}>
                Colonna
              </Button>
            )}
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addRow}>
              Riga
            </Button>
          </Stack>
        </Stack>

        <TableContainer component={Card} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} sx={{ minWidth: 150 }}>
                    {isCustom ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <TextField
                          variant="standard"
                          value={column.label}
                          onChange={(e) => updateColumn(column.key, { label: e.target.value })}
                          InputProps={{ disableUnderline: true, sx: { fontWeight: 600, fontSize: 14 } }}
                        />
                        <TextField
                          select
                          variant="standard"
                          value={column.type}
                          onChange={(e) => updateColumn(column.key, { type: e.target.value })}
                          InputProps={{ disableUnderline: true, sx: { fontSize: 11 } }}
                          sx={{ width: 70 }}
                        >
                          {COLUMN_TYPES.map((t) => (
                            <MenuItem key={t.value} value={t.value} sx={{ fontSize: 13 }}>
                              {t.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        {columns.length > 2 && (
                          <IconButton size="small" onClick={() => removeColumn(column.key)}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Stack>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ width: 96 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <TextField
                        fullWidth
                        variant="standard"
                        type={column.type === 'text' ? 'text' : 'number'}
                        value={row[column.key] ?? ''}
                        onChange={(e) => updateCell(row.id, column.key, e.target.value, column.type)}
                        InputProps={{
                          disableUnderline: true,
                          startAdornment:
                            column.type === 'price' ? (
                              <InputAdornment position="start">€</InputAdornment>
                            ) : undefined,
                        }}
                      />
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Tooltip title="Duplica">
                      <IconButton size="small" onClick={() => duplicateRow(row.id)}>
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <span>
                        <IconButton size="small" disabled={rows.length === 1} onClick={() => removeRow(row.id)}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <TextField
        fullWidth
        multiline
        minRows={2}
        label="Note sul listino"
        placeholder="Es. i prezzi non comprendono il trasporto oltre 50 km"
        value={value.notes || ''}
        onChange={(e) => set({ notes: e.target.value })}
      />

      <Alert severity={from ? 'success' : 'warning'}>
        {from
          ? `Nel catalogo il prodotto comparirà "da ${formatPrice(from, value.currency)}" ${
              value.vatIncluded ? 'IVA inclusa' : '+ IVA'
            }.`
          : 'Nessun prezzo valorizzato: il prodotto non può essere pubblicato.'}
      </Alert>

      <ConfirmDialog
        open={Boolean(pendingTemplate)}
        title="Cambiare modello di listino?"
        description="Le righe che hai compilato verranno sostituite con quelle del nuovo modello."
        confirmLabel="Cambia modello"
        destructive
        onConfirm={() => applyTemplate(pendingTemplate)}
        onClose={() => setPendingTemplate(null)}
      />

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importa la struttura di un listino</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vengono copiate colonne e righe; i prezzi restano da rivedere.
          </Typography>
          <List disablePadding>
            {importOptions.map((option) => (
              <ListItemButton
                key={option.id}
                onClick={() => {
                  set({
                    model: option.pricing.model,
                    columns: option.pricing.columns.map((c) => ({ ...c })),
                    rows: option.pricing.rows.map((r) => ({ ...r })),
                  })
                  setImportOpen(false)
                }}
                sx={{ border: 1, borderColor: 'divider', mb: 1 }}
              >
                <ListItemText primary={option.label} secondary={option.hint} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
