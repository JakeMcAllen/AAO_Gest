import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined'

import { api } from '../api/client.js'
import { useToast } from '../state/ToastProvider.jsx'

/**
 * La conversazione di una consegna: un thread per fulfilment, condiviso con
 * il cliente. Ogni cambio di stato (accettata, rifiutata, riprogrammata) vi
 * compare come messaggio di servizio — qui si vede la stessa storia che vede
 * il cliente sul sito pubblico.
 */
function formatWhen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return time
  const day = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  return `${day} · ${time}`
}

export function ChatDialog({ open, threadId, storeId, onClose }) {
  const toast = useToast()
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!open || !threadId) return
    let alive = true
    setLoading(true)
    api
      .getThreadMessages(threadId, storeId)
      .then((res) => {
        if (!alive) return
        setThread(res.thread)
        setMessages(res.messages)
      })
      .catch((err) => alive && toast.error(err.message || 'Conversazione non disponibile'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, threadId, storeId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setDraft('')
    const optimistic = {
      id: `tmp-${Date.now()}`,
      threadId,
      from: 'store',
      authorName: thread?.storeName || '',
      text,
      kind: 'message',
      createdAt: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    try {
      const saved = await api.sendThreadMessage(threadId, storeId, text)
      setMessages((m) => m.map((msg) => (msg.id === optimistic.id ? saved : msg)))
    } catch (err) {
      toast.error(err.message || 'Messaggio non inviato')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" component="span">
            {thread?.customerName || 'Conversazione'}
          </Typography>
          {thread && (
            <Typography variant="caption" color="text.secondary" display="block">
              Ordine {thread.reference}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', height: 460 }}>
        <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'grey.50' }}>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Carico la conversazione…
            </Typography>
          ) : messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nessun messaggio ancora.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {messages.map((m) =>
                m.kind === 'service' ? (
                  <Chip
                    key={m.id}
                    icon={<ScheduleIcon fontSize="small" />}
                    label={m.text}
                    variant="outlined"
                    sx={{ alignSelf: 'center', maxWidth: '92%', height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal' } }}
                  />
                ) : (
                  <Box
                    key={m.id}
                    sx={{
                      alignSelf: m.from === 'store' ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                      bgcolor: m.from === 'store' ? 'primary.main' : 'background.paper',
                      color: m.from === 'store' ? 'primary.contrastText' : 'text.primary',
                      border: m.from === 'store' ? 0 : 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      px: 1.75,
                      py: 1,
                    }}
                  >
                    <Typography variant="body2">{m.text}</Typography>
                    <Typography
                      variant="caption"
                      sx={{ opacity: 0.75, display: 'block', mt: 0.25 }}
                    >
                      {formatWhen(m.createdAt)}
                    </Typography>
                  </Box>
                ),
              )}
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Scrivi un messaggio…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button variant="contained" onClick={send} disabled={sending || !draft.trim()}>
            Invia
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
