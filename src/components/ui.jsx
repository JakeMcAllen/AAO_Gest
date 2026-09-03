// Primitive condivise: intestazioni, stati di caricamento/errore/vuoto, schede
// di sezione e conferme. Tenerle in un posto solo evita che ogni pagina
// reinventi la propria variante e mantiene l'interfaccia prevedibile.

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'

export function PageHeader({ title, subtitle, breadcrumbs = [], actions, sx }) {
  return (
    <Box sx={{ mb: 3, ...sx }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 1 }} aria-label="percorso">
          {breadcrumbs.map((crumb) =>
            crumb.to ? (
              <Link
                key={crumb.label}
                component={RouterLink}
                to={crumb.to}
                underline="hover"
                color="text.secondary"
                variant="body2"
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography key={crumb.label} variant="body2" color="text.primary">
                {crumb.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

export function SectionCard({ title, description, actions, children, dense, sx }) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      {(title || actions) && (
        <>
          <Box
            sx={{
              px: dense ? 2 : 3,
              py: dense ? 1.5 : 2,
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {title && <Typography variant="h3">{title}</Typography>}
              {description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {description}
                </Typography>
              )}
            </Box>
            {actions && (
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                {actions}
              </Stack>
            )}
          </Box>
          <Divider />
        </>
      )}
      <CardContent sx={{ p: dense ? 2 : 3, '&:last-child': { pb: dense ? 2 : 3 } }}>{children}</CardContent>
    </Card>
  )
}

export function EmptyState({ icon, title, description, action, compact }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: compact ? 4 : 8,
        px: 3,
        color: 'text.secondary',
      }}
    >
      {icon && (
        <Box sx={{ mb: 1.5, '& svg': { fontSize: compact ? 36 : 48, opacity: 0.35 } }}>{icon}</Box>
      )}
      <Typography variant="h3" color="text.primary" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ maxWidth: 460, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 3 }}>{action}</Box>}
    </Box>
  )
}

/**
 * Rende i tre stati di un `useResource` in modo uniforme: caricamento, errore
 * con possibilità di riprovare, e infine il contenuto.
 */
export function AsyncBlock({ resource, children, skeleton, empty, isEmpty }) {
  const { data, loading, error, reload } = resource
  if (loading && data === null) {
    return skeleton || <LoadingRows />
  }
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={reload}>
            Riprova
          </Button>
        }
      >
        {error.message || 'Caricamento non riuscito'}
      </Alert>
    )
  }
  if (empty && isEmpty?.(data)) return empty
  return (
    <Box sx={{ position: 'relative' }}>
      {loading && (
        <LinearProgress sx={{ position: 'absolute', top: -8, left: 0, right: 0, height: 2 }} />
      )}
      {children(data)}
    </Box>
  )
}

export function LoadingRows({ rows = 4, height = 64 }) {
  return (
    <Stack spacing={1.5}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={height} />
      ))}
    </Stack>
  )
}

export function Spinner({ label }) {
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
      <CircularProgress size={28} />
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
    </Stack>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  destructive,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{cancelLabel}</Button>
        <Button
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function StatCard({ label, value, hint, tone = 'default', icon, onClick }) {
  const tones = {
    default: 'divider',
    success: 'success.main',
    warning: 'warning.main',
    error: 'error.main',
  }
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2.5,
        height: '100%',
        borderLeft: 3,
        borderLeftColor: tones[tone],
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s, transform .15s',
        '&:hover': onClick ? { transform: 'translateY(-2px)' } : undefined,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        {icon && <Box sx={{ color: 'text.disabled', display: 'flex' }}>{icon}</Box>}
      </Stack>
      <Typography variant="h1" sx={{ mt: 0.5, fontSize: '1.9rem' }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Card>
  )
}

/** Etichetta + valore, per i riepiloghi di sola lettura. */
export function Labeled({ label, children, sx }) {
  return (
    <Box sx={sx}>
      <Typography variant="overline" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {children ?? '—'}
      </Typography>
    </Box>
  )
}
