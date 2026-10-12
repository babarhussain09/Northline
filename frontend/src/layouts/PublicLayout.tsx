import { AppBar, Box, Button, Container, Drawer, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import { Link as RouterLink, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

function Brand() {
  return (
    <Stack direction="row" spacing={1} alignItems="center" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'primary.main', color: '#F4F1EA', display: 'grid', placeItems: 'center', fontFamily: 'Fraunces, serif', fontWeight: 700 }}>N</Box>
      <Typography sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>Northline</Typography>
    </Stack>
  );
}

export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const destination = user?.role === 'ADMIN' ? '/admin' : user ? '/dashboard' : '/login';
  const nav = (
    <Stack spacing={{ xs: 2, md: 0 }} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
      {links.map((link) => (
        <Button key={link.to} component={NavLink} to={link.to} color="inherit" onClick={() => setOpen(false)} sx={{ '&.active': { color: 'secondary.main' } }}>
          {link.label}
        </Button>
      ))}
      {user?.role === 'CLIENT' && <Button component={RouterLink} to="/cart" color="inherit" onClick={() => setOpen(false)}>Cart</Button>}
      <Button component={RouterLink} to="/book-demo" variant="outlined" color="inherit" onClick={() => setOpen(false)} sx={{ ml: { md: 1 } }}>Book a demo</Button>
      <Button component={RouterLink} to={destination} variant="contained" onClick={() => setOpen(false)} sx={{ ml: { md: 1 } }}>
        {user ? 'Account' : 'Sign in'}
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(246,244,239,0.92)', backdropFilter: 'blur(10px)' }}>
        <Toolbar sx={{ minHeight: 72 }}>
          <Brand />
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>{nav}</Box>
          <IconButton sx={{ display: { md: 'none' } }} onClick={() => setOpen(true)} aria-label="Open menu"><MenuIcon /></IconButton>
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280, p: 2 }}>{nav}</Box>
      </Drawer>
      <Box component="main" sx={{ flex: 1 }}><Outlet /></Box>
      <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 5, mt: 8 }}>
        <Container>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}>
            <Box>
              <Brand />
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 360 }}>AI agents, automation, and custom software for teams that want the work to move.</Typography>
            </Box>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {links.map((link) => <Button key={link.to} component={RouterLink} to={link.to} color="inherit">{link.label}</Button>)}
              <Button component={RouterLink} to="/privacy" color="inherit">Privacy</Button>
              <Button component={RouterLink} to="/terms" color="inherit">Terms</Button>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>© {new Date().getFullYear()} Northline</Typography>
        </Container>
      </Box>
    </Box>
  );
}
