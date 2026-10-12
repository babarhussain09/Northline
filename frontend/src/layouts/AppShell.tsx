import { Box, Drawer, List, ListItemButton, ListItemText, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import { IconButton } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export function AppShell({ title, items }: { title: string; items: Array<{ to: string; label: string }> }) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nav = (
    <Box sx={{ width: 250, p: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#102433', color: '#F7F4EE' }}>
      <Typography sx={{ fontFamily: 'Fraunces, serif', fontSize: 22, px: 1, py: 1 }}>{title}</Typography>
      <Typography variant="body2" sx={{ px: 1, pb: 2, opacity: 0.7 }}>{user?.firstName} {user?.lastName}</Typography>
      <List sx={{ flex: 1 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.to === '/dashboard' || item.to === '/admin'}
            onClick={() => setOpen(false)}
            sx={{ borderRadius: 2, mb: 0.5, color: 'inherit', '&.active': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <ListItemButton onClick={() => logout().then(() => navigate('/'))} sx={{ borderRadius: 2, color: 'inherit' }}>
        <ListItemText primary="Sign out" />
      </ListItemButton>
    </Box>
  );

  return (
    <Stack direction="row" sx={{ minHeight: '100vh' }}>
      {mobile ? (
        <Drawer open={open} onClose={() => setOpen(false)}>{nav}</Drawer>
      ) : (
        nav
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {mobile && (
          <Stack direction="row" alignItems="center" sx={{ px: 1, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <IconButton onClick={() => setOpen(true)} aria-label="Open navigation"><MenuIcon /></IconButton>
            <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
          </Stack>
        )}
        <Box sx={{ p: { xs: 2, md: 4 } }}><Outlet /></Box>
      </Box>
    </Stack>
  );
}

export function Guard({ children, allow }: { children: ReactNode; allow: 'CLIENT' | 'ADMIN' }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allow) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  return children;
}
