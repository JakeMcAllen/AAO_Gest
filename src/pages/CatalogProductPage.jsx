import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/CheckOutlined'
import FlagIcon from '@mui/icons-material/OutlinedFlag'
import LockIcon from '@mui/icons-material/LockOutlined'
import PublicIcon from '@mui/icons-material/PublicOutlined'
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined'

import { api } from '../api/client.js'
import { PermissionDialog, ReportDialog } from '../components/dialogs.jsx'
import { AsyncBlock, EmptyState, Labeled, PageHeader, SectionCard, Spinner } from '../components/ui.jsx'
import { availabilityLabel, formatDate, formatPrice, priceFrom } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { useResource } from '../state/useResource.js'

export function CatalogProductPage() {
  const { productId } = useParams()
  const { store } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [reportTarget, setReportTarget] = useState(null)
  const [permissionRequest, setPermissionRequest] = useState(null)
  const [active, setActive] = useState(0)

  const context = useResource(async () => {
    const [product, images, sellers] = await Promise.all([
      api.getProduct(productId),
      api.listProductImages(productId, store.id),
      api.listListingsByProduct(productId),
    ])
    return { product, images, sellers }
  }, [productId, store.id])

  const sell = async (product) => {
    try {
      await api.createListing(store.id, product.id)
      toast.success('Prodotto aggiunto al tuo negozio')
      navigate(`/prodotti/${product.id}`)
    } catch (err) {
      if (err.code === 409) navigate(`/prodotti/${product.id}`)
      else toast.error(err.message)
    }
  }

  return (
    <AsyncBlock resource={context} skeleton={<Spinner />}>
      {({ product, images, sellers }) => {
        const mine = sellers.find((s) => s.storeId === store.id)
        const others = sellers.filter((s) => s.storeId !== store.id)
        const gallery = images.length ? images : []
        const current = gallery[Math.min(active, gallery.length - 1)]

        return (
          <>
            <PageHeader
              breadcrumbs={[{ label: 'Catalogo globale', to: '/catalogo' }, { label: product.name }]}
              title={product.name}
              subtitle={`${product.brand} · ${product.category} · scheda creata il ${formatDate(product.createdAt)}`}
              actions={[
                <Button
                  key="report"
                  startIcon={<FlagIcon />}
                  disabled={product.createdByStoreId === store.id}
                  onClick={() =>
                    setReportTarget({
                      type: 'product',
                      id: product.id,
                      ownerStoreId: product.createdByStoreId,
                      label: `${product.brand} — ${product.name}`,
                    })
                  }
                >
                  Segnala
                </Button>,
                mine ? (
                  <Button
                    key="open"
                    variant="contained"
                    startIcon={<CheckIcon />}
                    onClick={() => navigate(`/prodotti/${product.id}`)}
                  >
                    Apri la tua scheda
                  </Button>
                ) : (
                  <Button key="sell" variant="contained" startIcon={<AddIcon />} onClick={() => sell(product)}>
                    Vendi anche tu
                  </Button>
                ),
              ]}
            />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={3}>
                  <SectionCard title="Fotografie del prodotto" dense>
                    {gallery.length === 0 ? (
                      <EmptyState compact title="Nessuna fotografia" description="Nessun negozio ha ancora caricato foto per questa scheda." />
                    ) : (
                      <Stack spacing={1.5}>
                        <Box sx={{ aspectRatio: '4/3', bgcolor: 'action.hover', position: 'relative' }}>
                          <Box
                            component="img"
                            src={current.fullUrl}
                            alt={current.caption}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{ position: 'absolute', bottom: 8, left: 8 }}
                          >
                            <Chip
                              size="small"
                              label={current.ownerStoreId === store.id ? 'Tua' : current.ownerStoreName}
                            />
                            {current.generic ? (
                              <Chip size="small" color="info" icon={<PublicIcon />} label="Generica" />
                            ) : (
                              <Chip
                                size="small"
                                color={current.usable ? 'success' : 'default'}
                                icon={current.usable ? undefined : <LockIcon />}
                                label={current.usable ? 'Utilizzabile' : 'Su permesso'}
                              />
                            )}
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                          {gallery.map((image, index) => (
                            <Box
                              key={image.id}
                              onClick={() => setActive(index)}
                              component="img"
                              src={image.coverUrl}
                              alt={image.caption}
                              sx={{
                                width: 88,
                                height: 66,
                                objectFit: 'cover',
                                cursor: 'pointer',
                                flexShrink: 0,
                                border: 2,
                                borderColor: index === active ? 'primary.main' : 'transparent',
                                opacity: image.usable ? 1 : 0.55,
                              }}
                            />
                          ))}
                        </Stack>
                        {current && !current.usable && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VpnKeyIcon />}
                            onClick={() =>
                              setPermissionRequest({
                                productId,
                                productName: product.name,
                                ownerStoreId: current.ownerStoreId,
                                ownerStoreName: current.ownerStoreName,
                                defaultScopes: ['images'],
                              })
                            }
                          >
                            Chiedi il permesso a {current.ownerStoreName}
                          </Button>
                        )}
                      </Stack>
                    )}
                  </SectionCard>

                  <SectionCard title="Scheda tecnica">
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {product.description}
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(product.specs || {}).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell sx={{ color: 'text.secondary', width: '40%' }}>{key}</TableCell>
                            <TableCell>{value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </SectionCard>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={3}>
                  <SectionCard
                    title={`Venditori (${sellers.length})`}
                    description="Lo stesso prodotto, condizioni diverse: il compratore sceglie in base a zona, prezzo e servizi."
                    dense
                  >
                    {sellers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nessun negozio vende ancora questo prodotto.
                      </Typography>
                    ) : (
                      <Stack divider={<Divider />} spacing={0}>
                        {[...(mine ? [mine] : []), ...others].map((seller) => {
                          const avail = availabilityLabel(seller.availability)
                          const from = priceFrom(seller.pricing)
                          const isMine = seller.storeId === store.id
                          const services = (seller.services || []).filter((s) => s.enabled)
                          return (
                            <Box key={seller.storeId} sx={{ py: 2 }}>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar variant="rounded" src={seller.store?.logoUrl}>
                                  {seller.store?.name?.[0] || '?'}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle2" noWrap>
                                      {isMine ? 'Il tuo negozio' : seller.store?.name}
                                    </Typography>
                                    {isMine && <Chip size="small" color="primary" label="Tu" />}
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary">
                                    {seller.store?.city} · {(seller.store?.areas || []).length} aree servite
                                  </Typography>
                                </Box>
                                <Typography variant="subtitle2">
                                  {from ? formatPrice(from, seller.pricing?.currency) : '—'}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                <Chip size="small" label={avail.label} color={avail.color} variant="outlined" />
                                {services.slice(0, 3).map((s) => (
                                  <Chip key={s.type} size="small" variant="outlined" label={serviceLabel(s.type)} />
                                ))}
                              </Stack>
                              {!isMine && (
                                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                  <Button
                                    size="small"
                                    startIcon={<VpnKeyIcon />}
                                    onClick={() =>
                                      setPermissionRequest({
                                        productId,
                                        productName: product.name,
                                        ownerStoreId: seller.storeId,
                                        ownerStoreName: seller.store?.name,
                                        defaultScopes: ['images'],
                                      })
                                    }
                                  >
                                    Chiedi contenuti
                                  </Button>
                                  <Button
                                    size="small"
                                    startIcon={<FlagIcon />}
                                    onClick={() =>
                                      setReportTarget({
                                        type: 'listing',
                                        id: `${seller.storeId}#${productId}`,
                                        ownerStoreId: seller.storeId,
                                        label: `${product.name} presso ${seller.store?.name}`,
                                      })
                                    }
                                  >
                                    Segnala
                                  </Button>
                                </Stack>
                              )}
                            </Box>
                          )
                        })}
                      </Stack>
                    )}
                  </SectionCard>

                  <SectionCard title="Origine della scheda" dense>
                    <Stack spacing={1.5}>
                      <Labeled label="Creata da">
                        {sellers.find((s) => s.storeId === product.createdByStoreId)?.store?.name ||
                          (product.createdByStoreId === store.id ? store.name : product.createdByStoreId)}
                      </Labeled>
                      <Labeled label="Chiave di unicità">
                        <code>{product.catalogKey}</code>
                      </Labeled>
                      <Typography variant="caption" color="text.secondary">
                        Questa chiave impedisce che lo stesso prodotto venga inserito due volte in
                        catalogo. Solo il negozio che ha creato la scheda può modificarne i dati
                        tecnici; gli altri possono segnalarne gli errori.
                      </Typography>
                    </Stack>
                  </SectionCard>
                </Stack>
              </Grid>
            </Grid>

            <ReportDialog
              open={Boolean(reportTarget)}
              target={reportTarget}
              reporterStoreId={store.id}
              onClose={() => setReportTarget(null)}
            />
            <PermissionDialog
              open={Boolean(permissionRequest)}
              request={permissionRequest}
              requesterStoreId={store.id}
              onClose={() => setPermissionRequest(null)}
            />
          </>
        )
      }}
    </AsyncBlock>
  )
}

function serviceLabel(type) {
  return (
    {
      montaggio: 'Montaggio',
      consegna: 'Consegna',
      rilievo_misure: 'Rilievo',
      ritiro_usato: 'Ritiro usato',
      garanzia_estesa: 'Garanzia',
    }[type] || type
  )
}
