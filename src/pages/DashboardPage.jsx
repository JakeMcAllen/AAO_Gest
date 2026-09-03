import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import List from '@mui/material/List'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import FlagIcon from '@mui/icons-material/OutlinedFlag'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined'
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined'
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined'
import WarningIcon from '@mui/icons-material/WarningAmberOutlined'

import { api } from '../api/client.js'
import { AsyncBlock, EmptyState, PageHeader, SectionCard, StatCard } from '../components/ui.jsx'
import { availabilityLabel, daysLeft, formatDate, priceFrom, formatPrice } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useResource } from '../state/useResource.js'

export function DashboardPage() {
  const { store } = useSession()
  const navigate = useNavigate()

  const overview = useResource(async () => {
    const [listings, permissions, reports] = await Promise.all([
      api.listListingsByStore(store.id),
      api.listPermissions(store.id),
      api.listReports(store.id),
    ])
    return { listings, permissions, reports }
  }, [store.id])

  return (
    <>
      <PageHeader
        title={`Ciao, ${store.name}`}
        subtitle="Lo stato del tuo negozio sul marketplace: cosa è online, cosa sta per finire e cosa aspetta una tua risposta."
        actions={[
          <Button key="new" variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/prodotti/nuovo">
            Aggiungi prodotto
          </Button>,
        ]}
      />

      <AsyncBlock resource={overview}>
        {({ listings, permissions, reports }) => {
          const published = listings.filter((l) => l.status === 'published')
          const drafts = listings.filter((l) => l.status === 'draft')
          const lowStock = listings.filter(
            (l) =>
              l.availability?.mode === 'stock' &&
              Number(l.availability.stockQty) <= Number(l.availability.lowStockThreshold || 0),
          )
          const expiring = listings.filter((l) => {
            if (l.availability?.mode !== 'reseller') return false
            const left = daysLeft(l.availability.resellerTo)
            return left !== null && left <= 45
          })
          const pendingPermissions = permissions.incoming.filter((p) => p.status === 'pending')
          const openReports = reports.received.filter((r) => r.status === 'open')

          const todo = [
            ...expiring.map((l) => ({
              key: `exp-${l.productId}`,
              icon: <ScheduleIcon />,
              tone: daysLeft(l.availability.resellerTo) < 0 ? 'error' : 'warning',
              title: `${l.product?.name || l.productId}: accordo da rivenditore ${
                daysLeft(l.availability.resellerTo) < 0 ? 'scaduto' : 'in scadenza'
              }`,
              detail: `Scadenza ${formatDate(l.availability.resellerTo)}`,
              to: `/prodotti/${l.productId}`,
            })),
            ...lowStock.map((l) => ({
              key: `low-${l.productId}`,
              icon: <WarningIcon />,
              tone: Number(l.availability.stockQty) === 0 ? 'error' : 'warning',
              title: `${l.product?.name || l.productId}: ${
                Number(l.availability.stockQty) === 0 ? 'esaurito' : 'scorta bassa'
              }`,
              detail: `${l.availability.stockQty} pezzi in magazzino`,
              to: `/prodotti/${l.productId}`,
            })),
            ...pendingPermissions.map((p) => ({
              key: `perm-${p.id}`,
              icon: <VpnKeyIcon />,
              tone: 'default',
              title: `${p.requesterStore?.name} chiede l'uso dei tuoi contenuti`,
              detail: `${p.product?.name || '—'} · ${formatDate(p.createdAt)}`,
              to: '/permessi',
            })),
            ...openReports.map((r) => ({
              key: `rep-${r.id}`,
              icon: <FlagIcon />,
              tone: 'error',
              title: `Segnalazione da ${r.reporterStore?.name || 'un negozio'}`,
              detail: r.targetLabel,
              to: '/segnalazioni',
            })),
            ...drafts.map((l) => ({
              key: `draft-${l.productId}`,
              icon: <InventoryIcon />,
              tone: 'default',
              title: `${l.product?.name || l.productId}: bozza non pubblicata`,
              detail: 'Completa listino e disponibilità per andare online',
              to: `/prodotti/${l.productId}`,
            })),
          ]

          return (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard
                    label="Prodotti online"
                    value={published.length}
                    hint={drafts.length ? `${drafts.length} in bozza` : 'nessuna bozza'}
                    tone="success"
                    icon={<InventoryIcon fontSize="small" />}
                    onClick={() => navigate('/prodotti')}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard
                    label="Scorte critiche"
                    value={lowStock.length}
                    hint="sotto la soglia impostata"
                    tone={lowStock.length ? 'warning' : 'default'}
                    icon={<WarningIcon fontSize="small" />}
                    onClick={() => navigate('/prodotti?filtro=scorte')}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard
                    label="Permessi da valutare"
                    value={pendingPermissions.length}
                    hint={`${permissions.outgoing.filter((p) => p.status === 'granted').length} ricevuti attivi`}
                    tone={pendingPermissions.length ? 'warning' : 'default'}
                    icon={<VpnKeyIcon fontSize="small" />}
                    onClick={() => navigate('/permessi')}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard
                    label="Segnalazioni aperte"
                    value={openReports.length}
                    hint={`${reports.sent.length} inviate da te`}
                    tone={openReports.length ? 'error' : 'default'}
                    icon={<FlagIcon fontSize="small" />}
                    onClick={() => navigate('/segnalazioni')}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <SectionCard
                    title="Da sistemare"
                    description="Le cose che bloccano una vendita o aspettano una tua risposta."
                  >
                    {todo.length === 0 ? (
                      <EmptyState
                        compact
                        title="Tutto in ordine"
                        description="Nessuna scadenza, nessuna richiesta in sospeso e nessuna segnalazione aperta."
                      />
                    ) : (
                      <List disablePadding>
                        {todo.slice(0, 8).map((item) => (
                          <ListItemButton
                            key={item.key}
                            component={RouterLink}
                            to={item.to}
                            sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
                          >
                            <ListItemAvatar>
                              <Avatar
                                variant="rounded"
                                sx={{
                                  bgcolor: 'transparent',
                                  color: item.tone === 'default' ? 'text.secondary' : `${item.tone}.main`,
                                  border: 1,
                                  borderColor: 'divider',
                                }}
                              >
                                {item.icon}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={item.title}
                              secondary={item.detail}
                              primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    )}
                  </SectionCard>
                </Grid>

                <Grid size={{ xs: 12, lg: 5 }}>
                  <Stack spacing={3}>
                    <SectionCard
                      title="Ultimi aggiornamenti"
                      description="Le proposte modificate di recente."
                      actions={
                        <Button size="small" component={RouterLink} to="/prodotti">
                          Vedi tutte
                        </Button>
                      }
                    >
                      {listings.length === 0 ? (
                        <EmptyState
                          compact
                          title="Nessun prodotto"
                          description="Aggancia il primo prodotto al catalogo per iniziare a vendere."
                          action={
                            <Button variant="contained" component={RouterLink} to="/prodotti/nuovo">
                              Aggiungi prodotto
                            </Button>
                          }
                        />
                      ) : (
                        <List disablePadding>
                          {[...listings]
                            .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
                            .slice(0, 5)
                            .map((l) => {
                              const avail = availabilityLabel(l.availability)
                              const from = priceFrom(l.pricing)
                              return (
                                <ListItemButton
                                  key={l.productId}
                                  component={RouterLink}
                                  to={`/prodotti/${l.productId}`}
                                  sx={{ px: 1 }}
                                >
                                  <ListItemAvatar>
                                    <Avatar variant="rounded" src={l.coverUrl || undefined}>
                                      {l.product?.name?.[0] || '?'}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={l.product?.name || l.productId}
                                    secondary={from ? `da ${formatPrice(from)}` : 'listino da completare'}
                                    primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                                  />
                                  <Chip size="small" label={avail.label} color={avail.color} variant="outlined" />
                                </ListItemButton>
                              )
                            })}
                        </List>
                      )}
                    </SectionCard>

                    <SectionCard title="Il tuo negozio" dense>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar variant="rounded" src={store.logoUrl} sx={{ width: 56, height: 56 }}>
                          {store.name[0]}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {store.tagline || store.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {store.city} · {store.areas?.length || 0} aree servite
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          startIcon={<StorefrontIcon />}
                          component={RouterLink}
                          to="/negozio"
                        >
                          Modifica
                        </Button>
                      </Stack>
                    </SectionCard>
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          )
        }}
      </AsyncBlock>
    </>
  )
}
