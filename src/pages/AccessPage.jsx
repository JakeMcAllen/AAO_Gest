import { useNavigate } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import List from '@mui/material/List'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddBusinessIcon from '@mui/icons-material/AddBusinessOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

import { api, DATA_MODE } from '../api/client.js'
import { useSession } from '../state/SessionProvider.jsx'
import { useToast } from '../state/ToastProvider.jsx'
import { AsyncBlock, EmptyState } from '../components/ui.jsx'
import { useResource } from '../state/useResource.js'

export function AccessPage() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const stores = useResource(() => api.listStores(), [])

  const resetDemo = async () => {
    await api.resetDemoData()
    stores.reload()
    toast.info('Dati demo ripristinati')
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 300, fontSize: 22, lineHeight: 1 }}>allena</Typography>
          <Typography sx={{ letterSpacing: '0.22em', fontWeight: 600 }}>ARREDAMENTI</Typography>
        </Box>
        <Box sx={{ maxWidth: 460 }}>
          <Typography variant="h1" sx={{ fontSize: '2.6rem', mb: 2 }}>
            Il tuo negozio sul marketplace, gestito da un posto solo.
          </Typography>
          <Typography sx={{ opacity: 0.9 }}>
            Apri l&apos;attività, aggancia i prodotti al catalogo condiviso, decidi disponibilità,
            listini e servizi. Le foto e i dati restano tuoi: gli altri negozi li usano solo se dai
            il permesso.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Gestionale venditori · v1.0
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 480, p: { xs: 3, md: 4 } }}>
          <Typography variant="h2" gutterBottom>
            Accedi al gestionale
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Scegli il negozio che vuoi gestire.
            {DATA_MODE === 'demo' && ' In modalità demo i dati restano su questo dispositivo.'}
          </Typography>

          <AsyncBlock
            resource={stores}
            isEmpty={(data) => !data?.length}
            empty={
              <EmptyState
                compact
                title="Nessun negozio registrato"
                description="Apri la tua attività per iniziare a vendere sul marketplace."
              />
            }
          >
            {(data) => (
              <List disablePadding>
                {data.map((store) => (
                  <ListItemButton
                    key={store.id}
                    onClick={() => {
                      signIn(store.id, store.email)
                      navigate('/')
                    }}
                    sx={{ border: 1, borderColor: 'divider', mb: 1 }}
                  >
                    <ListItemAvatar>
                      <Avatar src={store.logoUrl} variant="rounded">
                        {store.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={store.name}
                      secondary={`${store.city} · ${store.email}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <Chip size="small" label={`${store.areas?.length || 0} aree`} variant="outlined" />
                  </ListItemButton>
                ))}
              </List>
            )}
          </AsyncBlock>

          <Divider sx={{ my: 3 }}>oppure</Divider>

          <Grid container spacing={1}>
            <Grid size={12}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<AddBusinessIcon />}
                onClick={() => navigate('/benvenuto')}
              >
                Apri un nuovo negozio
              </Button>
            </Grid>
          </Grid>

          {DATA_MODE === 'demo' && (
            <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
              <Button size="small" color="inherit" startIcon={<RestartAltIcon />} onClick={resetDemo}>
                Ripristina i dati demo
              </Button>
            </Stack>
          )}
        </Card>
      </Box>
    </Box>
  )
}
