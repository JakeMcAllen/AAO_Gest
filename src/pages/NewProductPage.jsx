import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/CheckOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'
import SearchIcon from '@mui/icons-material/SearchOutlined'

import { api } from '../api/client.js'
import { AsyncBlock, EmptyState, PageHeader, SectionCard } from '../components/ui.jsx'
import { CATEGORIES, catalogKey } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { useDebounced, useResource } from '../state/useResource.js'

const EMPTY_PRODUCT = { brand: '', name: '', category: '', description: '' }

export function NewProductPage() {
  const { store } = useSession()
  const navigate = useNavigate()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [specs, setSpecs] = useState([{ key: '', value: '' }])
  const [busy, setBusy] = useState(false)

  const debouncedQuery = useDebounced(query, 250)
  const results = useResource(
    () => api.searchProducts({ q: debouncedQuery, category }),
    [debouncedQuery, category],
  )
  const mine = useResource(() => api.listListingsByStore(store.id), [store.id])
  const mineIds = new Set((mine.data || []).map((l) => l.productId))

  // Controllo di unicità in tempo reale mentre si compila il nuovo prodotto.
  const draftKey = catalogKey(form)
  const debouncedKey = useDebounced(draftKey, 350)
  const duplicate = useResource(
    () => (form.name.trim().length >= 3 ? api.findDuplicate(form) : Promise.resolve(null)),
    [debouncedKey],
  )
  const exactDuplicate = duplicate.data?.match === 'exact' ? duplicate.data.product : null
  const similar = duplicate.data?.match === 'similar' ? duplicate.data.product : null

  const brands = useMemo(
    () => [...new Set((results.data || []).map((p) => p.brand))].sort(),
    [results.data],
  )

  const startSelling = async (product) => {
    if (mineIds.has(product.id)) {
      navigate(`/prodotti/${product.id}`)
      return
    }
    setBusy(true)
    try {
      await api.createListing(store.id, product.id)
      toast.success(`"${product.name}" aggiunto. Ora completa la tua offerta.`)
      navigate(`/prodotti/${product.id}`)
    } catch (err) {
      if (err.code === 409) navigate(`/prodotti/${product.id}`)
      else toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const createProduct = async () => {
    setBusy(true)
    try {
      const product = await api.createProduct({
        ...form,
        specs: Object.fromEntries(
          specs.filter((s) => s.key.trim() && s.value.trim()).map((s) => [s.key.trim(), s.value.trim()]),
        ),
        createdByStoreId: store.id,
      })
      await api.createListing(store.id, product.id)
      toast.success('Prodotto creato in catalogo e aggiunto al tuo negozio')
      navigate(`/prodotti/${product.id}`)
    } catch (err) {
      if (err.code === 409 && err.product) {
        toast.error('Questo prodotto esiste già in catalogo')
        duplicate.reload()
      } else {
        toast.error(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const formValid =
    form.brand.trim().length >= 2 &&
    form.name.trim().length >= 3 &&
    form.category &&
    form.description.trim().length >= 20 &&
    !exactDuplicate

  return (
    <>
      <PageHeader
        title="Aggiungi un prodotto"
        breadcrumbs={[{ label: 'I miei prodotti', to: '/prodotti' }, { label: 'Aggiungi' }]}
        subtitle="Il catalogo è condiviso fra tutti i negozi: ogni prodotto esiste una volta sola. Cerca se c'è già, altrimenti crealo tu e diventa la scheda di riferimento."
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title="1. Cerca nel catalogo condiviso"
            description="Se il prodotto c'è già, aggiungi solo le tue condizioni di vendita: foto, listino, disponibilità."
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome o marchio, es. Tulip oppure Moroso"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                label="Categoria"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Tutte</MenuItem>
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <AsyncBlock
              resource={results}
              isEmpty={(data) => !data?.length}
              empty={
                <EmptyState
                  compact
                  title="Nessun prodotto trovato"
                  description="Non esiste ancora una scheda con questo nome: puoi crearla tu qui accanto."
                />
              }
            >
              {(data) => (
                <List disablePadding sx={{ maxHeight: 520, overflowY: 'auto' }}>
                  {data.map((product) => {
                    const owned = mineIds.has(product.id)
                    return (
                      <ListItem
                        key={product.id}
                        divider
                        secondaryAction={
                          <Button
                            size="small"
                            variant={owned ? 'text' : 'contained'}
                            disabled={busy}
                            startIcon={owned ? <CheckIcon /> : <AddIcon />}
                            onClick={() => startSelling(product)}
                          >
                            {owned ? 'Già tuo' : 'Vendi anche tu'}
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar variant="rounded">{product.brand?.[0] || '?'}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={product.name}
                          secondary={
                            <>
                              {product.brand} · {product.category} ·{' '}
                              {product.sellersCount === 0
                                ? 'nessun venditore'
                                : `${product.sellersCount} venditori`}
                            </>
                          }
                          primaryTypographyProps={{ fontWeight: 500 }}
                          sx={{ pr: 12 }}
                        />
                      </ListItem>
                    )
                  })}
                </List>
              )}
            </AsyncBlock>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard
            title="2. Non lo trovi? Crealo"
            description="La scheda che crei diventa pubblica e riutilizzabile dagli altri negozi: nome, marchio e dati tecnici devono essere corretti."
            actions={
              !creating && (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
                  Nuova scheda
                </Button>
              )
            }
          >
            <Collapse in={creating} unmountOnExit>
              <Stack spacing={2.5}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Autocomplete
                      freeSolo
                      options={brands}
                      value={form.brand}
                      onInputChange={(_e, v) => setForm((p) => ({ ...p, brand: v }))}
                      renderInput={(params) => (
                        <TextField {...params} label="Marchio" placeholder="Es. Moroso" />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Categoria"
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      {CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Nome del prodotto"
                      placeholder="Es. Divano Tulip 3 posti"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      error={Boolean(exactDuplicate)}
                      helperText={
                        exactDuplicate
                          ? 'Nome già presente in catalogo'
                          : draftKey
                            ? `Chiave di catalogo: ${draftKey}`
                            : ' '
                      }
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Descrizione tecnica"
                      placeholder="Struttura, imbottitura, dimensioni principali…"
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      helperText={`${form.description.length} caratteri · minimo 20`}
                    />
                  </Grid>
                </Grid>

                {exactDuplicate && (
                  <Alert
                    severity="error"
                    action={
                      <Button color="inherit" size="small" onClick={() => startSelling(exactDuplicate)}>
                        Vendi questo
                      </Button>
                    }
                  >
                    <AlertTitle>Prodotto già in catalogo</AlertTitle>
                    <strong>{exactDuplicate.brand} — {exactDuplicate.name}</strong> esiste già. Non
                    puoi crearne una copia: aggancia la tua offerta alla scheda esistente.
                  </Alert>
                )}

                {!exactDuplicate && similar && (
                  <Alert
                    severity="warning"
                    action={
                      <Button color="inherit" size="small" onClick={() => startSelling(similar)}>
                        Apri
                      </Button>
                    }
                  >
                    Esiste un prodotto simile: <strong>{similar.brand} — {similar.name}</strong>.
                    Controlla che non sia lo stesso con un nome diverso.
                  </Alert>
                )}

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">Dati tecnici</Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setSpecs([...specs, { key: '', value: '' }])}>
                      Aggiungi
                    </Button>
                  </Stack>
                  <Stack spacing={1}>
                    {specs.map((spec, index) => (
                      <Stack direction="row" spacing={1} key={index} alignItems="center">
                        <TextField
                          placeholder="Es. Larghezza"
                          value={spec.key}
                          onChange={(e) =>
                            setSpecs(specs.map((s, i) => (i === index ? { ...s, key: e.target.value } : s)))
                          }
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          placeholder="Es. 220 cm"
                          value={spec.value}
                          onChange={(e) =>
                            setSpecs(specs.map((s, i) => (i === index ? { ...s, value: e.target.value } : s)))
                          }
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          disabled={specs.length === 1}
                          onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                </Box>

                <Divider />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    onClick={() => {
                      setCreating(false)
                      setForm(EMPTY_PRODUCT)
                    }}
                  >
                    Annulla
                  </Button>
                  <Button variant="contained" disabled={!formValid || busy} onClick={createProduct}>
                    Crea e vendi
                  </Button>
                </Stack>
              </Stack>
            </Collapse>

            {!creating && (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Prima di creare una scheda nuova, cerca con il nome del modello e con il marchio: le
                  schede duplicate vengono rifiutate dal sistema.
                </Typography>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {CATEGORIES.slice(0, 6).map((c) => (
                      <Chip
                        key={c}
                        size="small"
                        label={c}
                        onClick={() => setCategory(c)}
                        variant={category === c ? 'filled' : 'outlined'}
                        color={category === c ? 'primary' : 'default'}
                      />
                    ))}
                  </Stack>
                </Card>
                <Button component={RouterLink} to="/catalogo" size="small">
                  Sfoglia tutto il catalogo →
                </Button>
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </>
  )
}
