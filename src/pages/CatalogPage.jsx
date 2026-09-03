import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/CheckOutlined'
import SearchIcon from '@mui/icons-material/SearchOutlined'

import { api } from '../api/client.js'
import { AsyncBlock, EmptyState, PageHeader } from '../components/ui.jsx'
import { CATEGORIES } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { useDebounced, useResource } from '../state/useResource.js'

export function CatalogPage() {
  const { store } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const debounced = useDebounced(query, 250)

  const products = useResource(
    () => api.searchProducts({ q: debounced, category, brand }),
    [debounced, category, brand],
  )
  const mine = useResource(() => api.listListingsByStore(store.id), [store.id])
  const mineIds = new Set((mine.data || []).map((l) => l.productId))

  const allBrands = useMemo(
    () => [...new Set((products.data || []).map((p) => p.brand))].sort(),
    [products.data],
  )

  const sell = async (product) => {
    if (mineIds.has(product.id)) {
      navigate(`/prodotti/${product.id}`)
      return
    }
    try {
      await api.createListing(store.id, product.id)
      toast.success(`"${product.name}" aggiunto al tuo negozio`)
      navigate(`/prodotti/${product.id}`)
    } catch (err) {
      if (err.code === 409) navigate(`/prodotti/${product.id}`)
      else toast.error(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Catalogo globale"
        subtitle="Tutte le schede prodotto della piattaforma. Ogni prodotto esiste una volta sola e può essere venduto da più negozi, ciascuno con le proprie condizioni."
        actions={[
          <Button key="new" variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/prodotti/nuovo">
            Nuova scheda
          </Button>,
        ]}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome o marchio…"
          sx={{ flex: 1, maxWidth: 420 }}
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
        <TextField
          select
          label="Marchio"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Tutti</MenuItem>
          {allBrands.map((b) => (
            <MenuItem key={b} value={b}>
              {b}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <AsyncBlock
        resource={products}
        isEmpty={(data) => !data?.length}
        empty={
          <EmptyState
            title="Nessun prodotto in catalogo"
            description="Nessuna scheda corrisponde alla ricerca. Se il prodotto non esiste, puoi crearlo tu."
            action={
              <Button variant="contained" component={RouterLink} to="/prodotti/nuovo">
                Crea la scheda
              </Button>
            }
          />
        }
      >
        {(data) => (
          <Grid container spacing={2}>
            {data.map((product) => {
              const owned = mineIds.has(product.id)
              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} key={product.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      p: 2.5,
                      transition: 'box-shadow .15s',
                      '&:hover': { boxShadow: 3 },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="overline" color="text.secondary">
                        {product.brand}
                      </Typography>
                      {owned && <Chip size="small" color="success" variant="outlined" label="Lo vendi" />}
                    </Stack>
                    <Typography
                      variant="h4"
                      component={RouterLink}
                      to={`/catalogo/${product.id}`}
                      sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {product.description}
                    </Typography>

                    <Stack direction="row" spacing={0.5} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip size="small" variant="outlined" label={product.category} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          product.sellersCount === 0
                            ? 'nessun venditore'
                            : `${product.sellersCount} venditori`
                        }
                      />
                      <Chip size="small" variant="outlined" label={`${product.imagesCount} foto`} />
                    </Stack>

                    <Box sx={{ flex: 1 }} />
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button size="small" component={RouterLink} to={`/catalogo/${product.id}`}>
                        Dettagli
                      </Button>
                      <Box sx={{ flex: 1 }} />
                      <Button
                        size="small"
                        variant={owned ? 'text' : 'contained'}
                        startIcon={owned ? <CheckIcon /> : <AddIcon />}
                        onClick={() => sell(product)}
                      >
                        {owned ? 'Apri la tua scheda' : 'Vendi anche tu'}
                      </Button>
                    </Stack>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        )}
      </AsyncBlock>
    </>
  )
}
