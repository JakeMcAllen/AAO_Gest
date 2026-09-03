import { useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardIos'
import CloudUploadIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'
import FlagIcon from '@mui/icons-material/OutlinedFlag'
import LockIcon from '@mui/icons-material/LockOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PublicIcon from '@mui/icons-material/PublicOutlined'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'

import { api } from '../api/client.js'
import { ACCEPTED_TYPES } from '../api/media.js'
import { AsyncBlock, EmptyState } from './ui.jsx'
import { useResource } from '../state/useResource.js'
import { useToast } from '../state/ToastProvider.jsx'

const FILTERS = [
  { value: 'all', label: 'Tutte' },
  { value: 'mine', label: 'Le mie' },
  { value: 'generic', label: 'Generiche del catalogo' },
  { value: 'granted', label: 'Concesse a me' },
  { value: 'locked', label: 'Da autorizzare' },
]

/**
 * Fotografie del prodotto.
 *
 * Le foto appartengono al negozio che le ha caricate, ma vivono sul prodotto di
 * catalogo: chi le marca come "generiche" le mette a disposizione di tutti i
 * venditori, le altre restano private finché non arriva un permesso esplicito.
 * Per la propria scheda ogni negozio sceglie quali usare e con quale ruolo:
 * copertina (versione leggera, quella della card) o galleria (pagina prodotto).
 */
export function ImageManager({ productId, storeId, value = [], onChange, onRequestPermission, onReport }) {
  const toast = useToast()
  const fileInput = useRef(null)
  const [filter, setFilter] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [uploadDialog, setUploadDialog] = useState(null)
  const [menu, setMenu] = useState(null)

  const images = useResource(() => api.listProductImages(productId, storeId), [productId, storeId])
  const all = images.data || []
  const byId = Object.fromEntries(all.map((i) => [i.id, i]))
  const selected = value.filter((ref) => byId[ref.imageId])

  const setRefs = (refs) => onChange(refs.map((r, i) => ({ ...r, order: i })))

  const toggle = (image) => {
    if (!image.usable) return
    const exists = value.some((r) => r.imageId === image.id)
    if (exists) {
      setRefs(value.filter((r) => r.imageId !== image.id))
    } else {
      const isFirst = value.length === 0
      setRefs([...value, { imageId: image.id, role: isFirst ? 'cover' : 'gallery', order: value.length }])
    }
  }

  const setCover = (imageId) => {
    setRefs(
      value.map((r) => ({ ...r, role: r.imageId === imageId ? 'cover' : 'gallery' })),
    )
  }

  const move = (imageId, direction) => {
    const idx = value.findIndex((r) => r.imageId === imageId)
    const target = idx + direction
    if (idx === -1 || target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setRefs(next)
  }

  const pickFiles = () => fileInput.current?.click()

  const onFilesPicked = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length) setUploadDialog({ files, caption: '', generic: true })
  }

  const doUpload = async () => {
    const { files, caption, generic } = uploadDialog
    setUploadDialog(null)
    setUploading(true)
    try {
      const created = []
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        const image = await api.uploadImage({ productId, storeId, file, caption, generic })
        created.push(image)
      }
      await images.reload()
      const startIndex = value.length
      setRefs([
        ...value,
        ...created.map((img, i) => ({
          imageId: img.id,
          role: startIndex + i === 0 ? 'cover' : 'gallery',
          order: startIndex + i,
        })),
      ])
      toast.success(
        created.length === 1 ? 'Foto caricata e aggiunta alla scheda' : `${created.length} foto caricate`,
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const removeOwn = async (image) => {
    try {
      await api.deleteImage(image.id, storeId)
      setRefs(value.filter((r) => r.imageId !== image.id))
      await images.reload()
      toast.success('Foto eliminata')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const toggleGeneric = async (image) => {
    try {
      await api.updateImage(image.id, { generic: !image.generic }, storeId)
      await images.reload()
      toast.success(
        image.generic
          ? 'Foto resa privata: gli altri negozi dovranno chiederti il permesso'
          : 'Foto condivisa con il catalogo: ora è usabile da tutti i venditori',
      )
    } catch (err) {
      toast.error(err.message)
    }
  }

  const visible = all.filter((img) => {
    if (filter === 'mine') return img.ownerStoreId === storeId
    if (filter === 'generic') return img.generic && img.ownerStoreId !== storeId
    if (filter === 'granted') return img.usableReason === 'granted'
    if (filter === 'locked') return !img.usable
    return true
  })

  return (
    <Stack spacing={3}>
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={onFilesPicked}
      />

      {/* --- Foto usate nella scheda --- */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h4">Foto della tua scheda</Typography>
            <Typography variant="body2" color="text.secondary">
              La copertina è la miniatura leggera che compare nella card del catalogo; le altre si
              vedono aprendo la pagina prodotto.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={pickFiles} disabled={uploading}>
            Carica foto
          </Button>
        </Stack>

        {uploading && <LinearProgress sx={{ mb: 2 }} />}

        {selected.length === 0 ? (
          <Card variant="outlined" sx={{ borderStyle: 'dashed' }}>
            <EmptyState
              compact
              title="Nessuna foto selezionata"
              description="Carica le tue oppure scegli fra le foto generiche già presenti in catalogo."
              action={
                <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={pickFiles}>
                  Carica la prima foto
                </Button>
              }
            />
          </Card>
        ) : (
          <Grid container spacing={2}>
            {selected.map((ref, index) => {
              const image = byId[ref.imageId]
              const isCover = ref.role === 'cover'
              return (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={ref.imageId}>
                  <Card
                    sx={{
                      overflow: 'hidden',
                      borderColor: isCover ? 'primary.main' : 'divider',
                      borderWidth: isCover ? 2 : 1,
                    }}
                  >
                    <Box sx={{ position: 'relative', aspectRatio: '4/3', bgcolor: 'action.hover' }}>
                      <Box
                        component="img"
                        src={isCover ? image.coverUrl : image.fullUrl}
                        alt={image.caption || 'Foto prodotto'}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {isCover && (
                        <Chip
                          size="small"
                          color="primary"
                          icon={<StarIcon />}
                          label="Copertina"
                          sx={{ position: 'absolute', top: 8, left: 8 }}
                        />
                      )}
                    </Box>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ px: 0.5, py: 0.5 }}
                    >
                      <Stack direction="row">
                        <Tooltip title="Sposta prima">
                          <span>
                            <IconButton
                              size="small"
                              disabled={index === 0}
                              onClick={() => move(ref.imageId, -1)}
                            >
                              <ArrowBackIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Sposta dopo">
                          <span>
                            <IconButton
                              size="small"
                              disabled={index === selected.length - 1}
                              onClick={() => move(ref.imageId, 1)}
                            >
                              <ArrowForwardIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                      <Stack direction="row">
                        <Tooltip title={isCover ? 'È la copertina' : 'Usa come copertina'}>
                          <span>
                            <IconButton size="small" disabled={isCover} onClick={() => setCover(ref.imageId)}>
                              {isCover ? (
                                <StarIcon sx={{ fontSize: 18 }} color="primary" />
                              ) : (
                                <StarBorderIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Togli dalla scheda">
                          <IconButton size="small" onClick={() => toggle(image)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        )}
      </Box>

      {/* --- Libreria del prodotto --- */}
      <Box>
        <Typography variant="h4" gutterBottom>
          Fotografie disponibili per questo prodotto
        </Typography>
        <Tabs
          value={filter}
          onChange={(_e, v) => setFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {FILTERS.map((f) => {
            const count = all.filter((img) => {
              if (f.value === 'mine') return img.ownerStoreId === storeId
              if (f.value === 'generic') return img.generic && img.ownerStoreId !== storeId
              if (f.value === 'granted') return img.usableReason === 'granted'
              if (f.value === 'locked') return !img.usable
              return true
            }).length
            return (
              <Tab
                key={f.value}
                value={f.value}
                label={
                  <Badge badgeContent={count} color="default" sx={{ pr: count > 9 ? 2 : 1.5 }}>
                    {f.label}
                  </Badge>
                }
              />
            )
          })}
        </Tabs>

        <AsyncBlock
          resource={images}
          isEmpty={() => visible.length === 0}
          empty={
            <EmptyState
              compact
              title="Nessuna foto in questa vista"
              description="Cambia filtro oppure carica le tue fotografie."
            />
          }
        >
          {() => (
            <Grid container spacing={2}>
              {visible.map((image) => {
                const isSelected = value.some((r) => r.imageId === image.id)
                const own = image.ownerStoreId === storeId
                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={image.id}>
                    <Card
                      sx={{
                        overflow: 'hidden',
                        opacity: image.usable ? 1 : 0.62,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                      }}
                    >
                      <Box
                        onClick={() => toggle(image)}
                        sx={{
                          position: 'relative',
                          aspectRatio: '4/3',
                          bgcolor: 'action.hover',
                          cursor: image.usable ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <Box
                          component="img"
                          src={image.coverUrl || image.fullUrl}
                          alt={image.caption || 'Foto prodotto'}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {image.usable ? (
                          <Checkbox
                            checked={isSelected}
                            sx={{
                              position: 'absolute',
                              top: 2,
                              left: 2,
                              bgcolor: 'background.paper',
                              p: 0.4,
                              m: 0.5,
                              '&:hover': { bgcolor: 'background.paper' },
                            }}
                            size="small"
                          />
                        ) : (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'rgba(20,20,20,0.35)',
                              color: '#fff',
                            }}
                          >
                            <LockIcon />
                          </Box>
                        )}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenu({ anchor: e.currentTarget, image })
                          }}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'background.paper' },
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ p: 1 }}>
                        <Typography variant="caption" noWrap display="block" title={image.caption}>
                          {image.caption || 'Senza didascalia'}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={own ? 'Tua' : image.ownerStoreName}
                            sx={{ maxWidth: '100%' }}
                          />
                          {image.generic && (
                            <Chip size="small" color="info" variant="outlined" icon={<PublicIcon />} label="Generica" />
                          )}
                          {image.usableReason === 'granted' && (
                            <Chip size="small" color="success" variant="outlined" label="Concessa" />
                          )}
                        </Stack>
                        {!image.usable && (
                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                            onClick={() => onRequestPermission?.(image)}
                          >
                            Chiedi il permesso
                          </Button>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </AsyncBlock>
      </Box>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu?.image.ownerStoreId === storeId && (
          <MenuItem
            onClick={() => {
              toggleGeneric(menu.image)
              setMenu(null)
            }}
          >
            <PublicIcon fontSize="small" sx={{ mr: 1.5 }} />
            {menu.image.generic ? 'Rendi privata' : 'Condividi con il catalogo'}
          </MenuItem>
        )}
        {menu?.image.ownerStoreId === storeId && (
          <MenuItem
            onClick={() => {
              removeOwn(menu.image)
              setMenu(null)
            }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
            Elimina definitivamente
          </MenuItem>
        )}
        {menu?.image.ownerStoreId !== storeId && (
          <MenuItem
            onClick={() => {
              onReport?.(menu.image)
              setMenu(null)
            }}
          >
            <FlagIcon fontSize="small" sx={{ mr: 1.5 }} />
            Segnala questa foto
          </MenuItem>
        )}
      </Menu>

      <Dialog open={Boolean(uploadDialog)} onClose={() => setUploadDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {uploadDialog?.files.length === 1
            ? 'Carica la fotografia'
            : `Carica ${uploadDialog?.files.length} fotografie`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Didascalia"
              placeholder="Es. ambientata nel nostro showroom"
              value={uploadDialog?.caption || ''}
              onChange={(e) => setUploadDialog((p) => ({ ...p, caption: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={uploadDialog?.generic || false}
                  onChange={(e) => setUploadDialog((p) => ({ ...p, generic: e.target.checked }))}
                />
              }
              label="Condividi come foto generica del catalogo"
            />
            <Alert severity="info" variant="outlined">
              {uploadDialog?.generic
                ? 'Ogni venditore di questo prodotto potrà usarla, indicandoti come proprietario.'
                : 'Resta tua: gli altri negozi dovranno chiederti un permesso esplicito per usarla.'}
            </Alert>
            <Typography variant="caption" color="text.secondary">
              Da ogni file ricaviamo due versioni: una leggera per le card del catalogo e una ad alta
              risoluzione per la pagina prodotto.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUploadDialog(null)}>Annulla</Button>
          <Button variant="contained" onClick={doUpload}>
            Carica
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
