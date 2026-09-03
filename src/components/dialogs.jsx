import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { api } from '../api/client.js'
import { PERMISSION_SCOPES, REPORT_REASONS, REPORT_TARGETS } from '../domain.js'
import { useToast } from '../state/ToastProvider.jsx'

const MIN_COMMENT = 20

/**
 * Segnalazione di un contenuto altrui. Il commento è obbligatorio: una
 * segnalazione senza motivazione non è lavorabile da chi la riceve.
 */
export function ReportDialog({ open, target, reporterStoreId, onClose, onCreated }) {
  const toast = useToast()
  const [reason, setReason] = useState('wrong_data')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('wrong_data')
      setComment('')
      setTouched(false)
    }
  }, [open])

  const tooShort = comment.trim().length < MIN_COMMENT

  const submit = async () => {
    setTouched(true)
    if (tooShort) return
    setSaving(true)
    try {
      const report = await api.createReport({
        targetType: target.type,
        targetId: target.id,
        targetOwnerStoreId: target.ownerStoreId,
        reporterStoreId,
        reason,
        comment: comment.trim(),
      })
      toast.success('Segnalazione inviata. La trovi in Segnalazioni → Inviate.')
      onCreated?.(report)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!target) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Segnala un contenuto</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Box>
            <Typography variant="overline" color="text.secondary" display="block">
              {REPORT_TARGETS[target.type]}
            </Typography>
            <Typography variant="subtitle2">{target.label}</Typography>
          </Box>

          <TextField select fullWidth label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REPORT_REASONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Cosa non va"
            placeholder="Descrivi il problema con riferimenti concreti: chi legge deve poter verificare."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            error={touched && tooShort}
            helperText={
              touched && tooShort
                ? `Servono almeno ${MIN_COMMENT} caratteri`
                : `${comment.trim().length} caratteri`
            }
          />

          <Alert severity="info" variant="outlined">
            La segnalazione viene registrata con il nome del tuo negozio e resta consultabile dal
            negozio segnalato e dalla piattaforma.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          Invia segnalazione
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/**
 * Richiesta a un altro negozio di poter usare i suoi contenuti su un prodotto.
 * Il proprietario risponde dalla pagina Permessi.
 */
export function PermissionDialog({ open, request, requesterStoreId, onClose, onCreated }) {
  const toast = useToast()
  const [scopes, setScopes] = useState(['images'])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setScopes(request?.defaultScopes || ['images'])
      setMessage('')
    }
  }, [open, request])

  const toggleScope = (scope) =>
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]))

  const submit = async () => {
    if (!scopes.length) return
    setSaving(true)
    try {
      const permission = await api.requestPermission({
        productId: request.productId,
        ownerStoreId: request.ownerStoreId,
        requesterStoreId,
        scopes,
        message: message.trim(),
      })
      toast.success(`Richiesta inviata a ${request.ownerStoreName}`)
      onCreated?.(permission)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!request) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Chiedi il permesso a {request.ownerStoreName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Prodotto: <strong>{request.productName}</strong>. Il negozio riceve la richiesta e decide
            cosa concederti; puoi usare i contenuti solo dopo l&apos;approvazione.
          </Typography>

          <Box>
            <Typography variant="overline" color="text.secondary">
              Cosa chiedi
            </Typography>
            <Stack>
              {PERMISSION_SCOPES.map((scope) => (
                <FormControlLabel
                  key={scope.value}
                  control={
                    <Checkbox
                      checked={scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{scope.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {scope.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mb: 1 }}
                />
              ))}
            </Stack>
          </Box>

          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Messaggio"
            placeholder="Spiega perché ti servono e come li useresti."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !scopes.length}>
          Invia richiesta
        </Button>
      </DialogActions>
    </Dialog>
  )
}
