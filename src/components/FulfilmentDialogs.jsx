import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { formatDate, sellerAcceptsDate, sellerDeliveryOf } from '../domain.js'

/**
 * Rifiuta una consegna: serve sempre un motivo, perché è quello che il
 * cliente legge in chat — «non posso evadere questo ordine» senza altro non
 * aiuta nessuno a capire cosa fare dopo.
 */
export function RejectFulfilmentDialog({ open, fulfilment, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  async function submit() {
    setSaving(true)
    try {
      await onConfirm(reason.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Rifiuta la consegna</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fulfilment?.reference} — {fulfilment?.customerName}. Il cliente legge questo motivo
          nella chat dell&apos;ordine.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Perché non puoi evaderlo"
          placeholder="Es. articolo esaurito, zona non più coperta, misure incompatibili…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Annulla
        </Button>
        <Button color="error" variant="contained" onClick={submit} disabled={saving || !reason.trim()}>
          {saving ? 'Rifiuto…' : 'Rifiuta consegna'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/**
 * Propone un'altra data. Solo le date che il proprio calendario accetta sono
 * selezionabili: non ha senso proporre un giorno che poi si rifiuterebbe.
 */
export function RescheduleFulfilmentDialog({ open, fulfilment, store, onClose, onConfirm }) {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDate('')
      setNote('')
    }
  }, [open])

  const delivery = store?.delivery
  const valid = date ? sellerAcceptsDate(delivery, date) : false
  const rules = useMemo(() => sellerDeliveryOf({ delivery }), [delivery])

  async function submit() {
    setSaving(true)
    try {
      await onConfirm(date, note.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Proponi un&apos;altra data</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fulfilment?.reference} chiedeva il{' '}
          <strong>{fulfilment ? formatDate(fulfilment.requestedDate) : ''}</strong>. Il cliente
          dovrà accettare o rifiutare la nuova data prima che l&apos;ordine sia confermato.
        </Typography>

        <Stack spacing={2}>
          <TextField
            type="date"
            label="Nuova data"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            error={!!date && !valid}
            helperText={date && !valid ? 'Non è una data che consegni: controlla il tuo calendario.' : ' '}
          />
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              Consegni:
            </Typography>
            {rules.weekdays.length === 0 ? (
              <Chip size="small" color="error" label="nessun giorno impostato" />
            ) : (
              ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(
                (label, idx) =>
                  rules.weekdays.includes(idx) && <Chip key={idx} size="small" label={label} />,
              )
            )}
          </Stack>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Nota per il cliente (facoltativa)"
            placeholder="Es. possiamo consegnare solo il mercoledì in quella zona"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {!rules.weekdays.length && (
            <Alert severity="warning">
              Il tuo calendario non ha giorni di consegna: impostalo dal profilo del negozio prima
              di riprogrammare.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Annulla
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving || !valid}>
          {saving ? 'Invio…' : 'Proponi data'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
