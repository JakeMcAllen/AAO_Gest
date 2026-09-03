import { useState } from 'react'
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
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckIcon from '@mui/icons-material/CheckOutlined'
import CloseIcon from '@mui/icons-material/CloseOutlined'
import UndoIcon from '@mui/icons-material/UndoOutlined'
import VpnKeyIcon from '@mui/icons-material/VpnKeyOutlined'

import { api } from '../api/client.js'
import { AsyncBlock, EmptyState, PageHeader } from '../components/ui.jsx'
import { PERMISSION_SCOPES, PERMISSION_STATUSES, formatDate } from '../domain.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { useResource } from '../state/useResource.js'

export function PermissionsPage() {
  const { store } = useSession()
  const toast = useToast()
  const [tab, setTab] = useState('incoming')
  const [grantDialog, setGrantDialog] = useState(null)

  const permissions = useResource(() => api.listPermissions(store.id), [store.id])

  const respond = async (permission, patch, message) => {
    try {
      await api.updatePermission(permission.id, patch, store.id)
      permissions.reload()
      toast.success(message)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Permessi sui contenuti"
        subtitle="Le foto e le schede che carichi restano tue. Un altro negozio può riutilizzarle solo se glielo concedi esplicitamente, e puoi revocare il permesso quando vuoi."
      />

      <AsyncBlock resource={permissions}>
        {({ incoming, outgoing }) => {
          const pending = incoming.filter((p) => p.status === 'pending')
          const list = tab === 'incoming' ? incoming : outgoing
          return (
            <>
              <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tab
                  value="incoming"
                  label={
                    <Badge color="primary" badgeContent={pending.length} sx={{ pr: pending.length ? 2 : 0 }}>
                      Richieste ricevute
                    </Badge>
                  }
                />
                <Tab value="outgoing" label={`Richieste inviate (${outgoing.length})`} />
              </Tabs>

              {tab === 'incoming' && pending.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  {pending.length === 1
                    ? 'Un negozio aspetta la tua risposta.'
                    : `${pending.length} negozi aspettano la tua risposta.`}
                </Alert>
              )}

              {list.length === 0 ? (
                <EmptyState
                  icon={<VpnKeyIcon />}
                  title={tab === 'incoming' ? 'Nessuna richiesta ricevuta' : 'Nessuna richiesta inviata'}
                  description={
                    tab === 'incoming'
                      ? 'Quando un altro negozio vorrà usare le tue foto o le tue schede, la richiesta comparirà qui.'
                      : 'Dal catalogo puoi chiedere a un negozio di usare i suoi contenuti su un prodotto che vendete entrambi.'
                  }
                  action={
                    tab === 'outgoing' && (
                      <Button variant="contained" component={RouterLink} to="/catalogo">
                        Vai al catalogo
                      </Button>
                    )
                  }
                />
              ) : (
                <Grid container spacing={2}>
                  {list.map((permission) => {
                    const counterpart =
                      tab === 'incoming' ? permission.requesterStore : permission.ownerStore
                    const status = PERMISSION_STATUSES[permission.status]
                    const expired =
                      permission.expiresAt && new Date(permission.expiresAt).getTime() < Date.now()
                    return (
                      <Grid size={{ xs: 12, lg: 6 }} key={permission.id}>
                        <Card sx={{ p: 2.5, height: '100%' }}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Avatar variant="rounded" src={counterpart?.logoUrl}>
                              {counterpart?.name?.[0] || '?'}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2">{counterpart?.name || '—'}</Typography>
                                <Chip
                                  size="small"
                                  label={expired && permission.status === 'granted' ? 'Scaduto' : status.label}
                                  color={expired && permission.status === 'granted' ? 'default' : status.color}
                                />
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {permission.product?.name || permission.productId} ·{' '}
                                {formatDate(permission.createdAt)}
                              </Typography>

                              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
                                {permission.scopes.map((scope) => (
                                  <Chip
                                    key={scope}
                                    size="small"
                                    variant="outlined"
                                    label={PERMISSION_SCOPES.find((s) => s.value === scope)?.label || scope}
                                  />
                                ))}
                              </Stack>

                              {permission.message && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    mt: 1.5,
                                    p: 1.5,
                                    bgcolor: 'action.hover',
                                    borderLeft: 2,
                                    borderColor: 'divider',
                                  }}
                                >
                                  {permission.message}
                                </Typography>
                              )}

                              {permission.responseNote && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  Risposta: {permission.responseNote}
                                </Typography>
                              )}

                              {permission.expiresAt && permission.status === 'granted' && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  Valido fino al {formatDate(permission.expiresAt)}
                                </Typography>
                              )}

                              {tab === 'incoming' && (
                                <>
                                  <Divider sx={{ my: 1.5 }} />
                                  <Stack direction="row" spacing={1}>
                                    {permission.status === 'pending' && (
                                      <>
                                        <Button
                                          size="small"
                                          variant="contained"
                                          startIcon={<CheckIcon />}
                                          onClick={() => setGrantDialog({ permission, note: '', expiresAt: '' })}
                                        >
                                          Concedi
                                        </Button>
                                        <Button
                                          size="small"
                                          startIcon={<CloseIcon />}
                                          onClick={() =>
                                            respond(
                                              permission,
                                              { status: 'denied' },
                                              `Richiesta di ${counterpart?.name} rifiutata`,
                                            )
                                          }
                                        >
                                          Rifiuta
                                        </Button>
                                      </>
                                    )}
                                    {permission.status === 'granted' && (
                                      <Button
                                        size="small"
                                        color="error"
                                        startIcon={<UndoIcon />}
                                        onClick={() =>
                                          respond(
                                            permission,
                                            { status: 'revoked' },
                                            `Permesso revocato a ${counterpart?.name}`,
                                          )
                                        }
                                      >
                                        Revoca
                                      </Button>
                                    )}
                                    {['denied', 'revoked'].includes(permission.status) && (
                                      <Button
                                        size="small"
                                        onClick={() => setGrantDialog({ permission, note: '', expiresAt: '' })}
                                      >
                                        Concedi ora
                                      </Button>
                                    )}
                                  </Stack>
                                </>
                              )}
                            </Box>
                          </Stack>
                        </Card>
                      </Grid>
                    )
                  })}
                </Grid>
              )}
            </>
          )
        }}
      </AsyncBlock>

      <Dialog open={Boolean(grantDialog)} onClose={() => setGrantDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Concedi il permesso</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {grantDialog?.permission.requesterStore?.name} potrà usare i contenuti concessi sul
              prodotto {grantDialog?.permission.product?.name}. Puoi revocare in qualsiasi momento.
            </Typography>
            <TextField
              fullWidth
              type="date"
              label="Scadenza (facoltativa)"
              value={grantDialog?.expiresAt || ''}
              onChange={(e) => setGrantDialog((p) => ({ ...p, expiresAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText="Lascia vuoto per un permesso senza scadenza"
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Nota per il richiedente"
              placeholder="Es. citate il nostro showroom nella didascalia"
              value={grantDialog?.note || ''}
              onChange={(e) => setGrantDialog((p) => ({ ...p, note: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGrantDialog(null)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={() => {
              respond(
                grantDialog.permission,
                {
                  status: 'granted',
                  responseNote: grantDialog.note,
                  expiresAt: grantDialog.expiresAt,
                },
                'Permesso concesso',
              )
              setGrantDialog(null)
            }}
          >
            Concedi
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
