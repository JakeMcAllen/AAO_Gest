import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import FlagIcon from '@mui/icons-material/OutlinedFlag'
import GavelIcon from '@mui/icons-material/GavelOutlined'

import { api } from '../api/client.js'
import { AsyncBlock, EmptyState, PageHeader, StatCard } from '../components/ui.jsx'
import { REPORT_REASONS, REPORT_STATUSES, REPORT_TARGETS, formatDate } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { useResource } from '../state/useResource.js'

const STATUS_FILTERS = [
  { value: 'all', label: 'Tutte' },
  { value: 'open', label: 'Aperte' },
  { value: 'in_review', label: 'In esame' },
  { value: 'resolved', label: 'Risolte' },
  { value: 'rejected', label: 'Respinte' },
]

export function ReportsPage() {
  const { store } = useSession()
  const toast = useToast()
  const [tab, setTab] = useState('received')
  const [status, setStatus] = useState('all')
  const [handling, setHandling] = useState(null)

  const reports = useResource(() => api.listReports(store.id), [store.id])

  const lists = reports.data || { sent: [], received: [] }
  const visible = useMemo(() => {
    const list = tab === 'received' ? lists.received : lists.sent
    return [...list]
      .filter((r) => status === 'all' || r.status === status)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  }, [lists, tab, status])

  const save = async () => {
    try {
      await api.updateReport(
        handling.report.id,
        { status: handling.status, resolutionNote: handling.note },
        store.id,
      )
      setHandling(null)
      reports.reload()
      toast.success('Segnalazione aggiornata')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Segnalazioni"
        subtitle="Ogni negozio può segnalare un contenuto altrui allegando una motivazione. Le segnalazioni sono registrate a parte e restano consultabili da chi le riceve e dalla piattaforma."
        actions={[
          <Button key="catalog" component={RouterLink} to="/catalogo" startIcon={<FlagIcon />}>
            Segnala dal catalogo
          </Button>,
        ]}
      />

      <AsyncBlock resource={reports}>
        {({ sent, received }) => {
          const open = received.filter((r) => r.status === 'open')
          const inReview = received.filter((r) => r.status === 'in_review')
          const resolved = received.filter((r) => r.status === 'resolved')

          return (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Aperte su di te" value={open.length} tone={open.length ? 'error' : 'default'} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="In esame" value={inReview.length} tone={inReview.length ? 'warning' : 'default'} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Risolte" value={resolved.length} tone="success" />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard label="Inviate da te" value={sent.length} />
                </Grid>
              </Grid>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ md: 'center' }}
                sx={{ mb: 3 }}
              >
                <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
                  <Tab
                    value="received"
                    label={
                      <Badge color="error" badgeContent={open.length} sx={{ pr: open.length ? 2 : 0 }}>
                        Sui tuoi contenuti
                      </Badge>
                    }
                  />
                  <Tab value="sent" label={`Inviate da te (${sent.length})`} />
                </Tabs>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={status}
                  onChange={(_e, v) => v && setStatus(v)}
                >
                  {STATUS_FILTERS.map((f) => (
                    <ToggleButton key={f.value} value={f.value}>
                      {f.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>

              {tab === 'received' && open.length > 0 && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {open.length === 1
                    ? 'Una segnalazione aperta riguarda un tuo contenuto.'
                    : `${open.length} segnalazioni aperte riguardano tuoi contenuti.`}{' '}
                  Rispondere in fretta evita la sospensione della scheda.
                </Alert>
              )}

              {visible.length === 0 ? (
                <EmptyState
                  icon={<GavelIcon />}
                  title={tab === 'received' ? 'Nessuna segnalazione ricevuta' : 'Nessuna segnalazione inviata'}
                  description={
                    tab === 'received'
                      ? 'I tuoi contenuti non sono stati contestati da nessun negozio.'
                      : 'Se trovi una scheda sbagliata o una foto che non dovrebbe essere lì, segnalala dal catalogo o dalla pagina prodotto.'
                  }
                />
              ) : (
                <Stack spacing={2}>
                  {visible.map((report) => {
                    const counterpart = tab === 'received' ? report.reporterStore : report.targetOwnerStore
                    const statusInfo = REPORT_STATUSES[report.status]
                    const reason = REPORT_REASONS.find((r) => r.value === report.reason)
                    return (
                      <Card key={report.id} sx={{ p: 2.5 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          <Avatar variant="rounded" src={counterpart?.logoUrl}>
                            {counterpart?.name?.[0] || '?'}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ flexWrap: 'wrap', gap: 1 }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip size="small" label={statusInfo.label} color={statusInfo.color} />
                                <Chip size="small" variant="outlined" label={reason?.label || report.reason} />
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={REPORT_TARGETS[report.targetType]}
                                />
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(report.createdAt)}
                              </Typography>
                            </Stack>

                            <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                              {report.targetLabel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tab === 'received'
                                ? `Segnalato da ${counterpart?.name || '—'}`
                                : `Segnalato a ${counterpart?.name || '—'}`}
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderLeft: 2, borderColor: 'divider' }}
                            >
                              {report.comment}
                            </Typography>

                            {report.resolutionNote && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Esito: {report.resolutionNote}
                              </Typography>
                            )}

                            {tab === 'received' && (
                              <>
                                <Divider sx={{ my: 1.5 }} />
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() =>
                                      setHandling({
                                        report,
                                        status: report.status === 'open' ? 'in_review' : report.status,
                                        note: report.resolutionNote || '',
                                      })
                                    }
                                  >
                                    Gestisci
                                  </Button>
                                  {report.targetType === 'product' && (
                                    <Button size="small" component={RouterLink} to={`/catalogo/${report.targetId}`}>
                                      Apri la scheda
                                    </Button>
                                  )}
                                  {report.targetType === 'listing' && (
                                    <Button
                                      size="small"
                                      component={RouterLink}
                                      to={`/prodotti/${String(report.targetId).split('#')[1]}`}
                                    >
                                      Apri la proposta
                                    </Button>
                                  )}
                                </Stack>
                              </>
                            )}
                          </Box>
                        </Stack>
                      </Card>
                    )
                  })}
                </Stack>
              )}
            </>
          )
        }}
      </AsyncBlock>

      <Dialog open={Boolean(handling)} onClose={() => setHandling(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Gestisci la segnalazione</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {handling?.report.targetLabel}
            </Typography>
            <TextField
              select
              fullWidth
              label="Stato"
              value={handling?.status || 'in_review'}
              onChange={(e) => setHandling((p) => ({ ...p, status: e.target.value }))}
            >
              {Object.entries(REPORT_STATUSES).map(([value, info]) => (
                <MenuItem key={value} value={value}>
                  {info.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Nota di esito"
              placeholder="Cosa hai fatto o perché la segnalazione non è fondata"
              value={handling?.note || ''}
              onChange={(e) => setHandling((p) => ({ ...p, note: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHandling(null)}>Annulla</Button>
          <Button variant="contained" onClick={save}>
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
