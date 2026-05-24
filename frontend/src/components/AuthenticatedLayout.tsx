import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  Divider,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import BoltIcon from '@mui/icons-material/Bolt';
import { useAuthStore } from '../store/authStore';
import ThemeToggle from './ThemeToggle';
import { alpha } from '@mui/material';

const DRAWER_WIDTH = 268;

const NAV = [
  { label: 'Home',       path: '/dashboard',   icon: DashboardIcon },
  { label: 'Skills',     path: '/skills',       icon: AccountTreeIcon },
  { label: 'Analytics',  path: '/analytics',    icon: QueryStatsIcon },
  { label: 'Ranks',      path: '/leaderboard',  icon: EmojiEventsIcon },
];

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const accent = theme.palette.primary.main;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2, minHeight: 64 }}>
        <Typography
          variant="h6"
          onClick={() => {
            navigate('/dashboard');
            setMobileOpen(false);
          }}
          sx={{
            fontFamily: '"Literata", Georgia, serif',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.02em',
          }}
        >
          SkillQuest
        </Typography>
      </Toolbar>
      <List sx={{ px: 1, py: 1, flex: 1 }}>
        {NAV.map((item) => {
          const active =
            item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  borderLeft: `3px solid ${accent}`,
                  pl: 1.75,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 600 : 500, fontSize: '0.9375rem' }} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Appearance
          </Typography>
          <ThemeToggle />
        </Box>
      </Box>
    </Box>
  );

  const handleLogout = () => {
    logout();
    navigate('/');
    setAnchorEl(null);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { md: 'none' },
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: 56 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: '"Literata", Georgia, serif' }}>
            SkillQuest
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <ThemeToggle />
          {user && (
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.5, p: 0.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  bgcolor: 'action.hover',
                  color: 'primary.main',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {user.username[0].toUpperCase()}
              </Avatar>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          pt: { xs: '56px', md: 0 },
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            display: { xs: 'none', md: 'block' },
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ minHeight: 64, justifyContent: 'flex-end', gap: 1 }}>
            {user && user.streak > 0 && (
              <Chip
                icon={<LocalFireDepartmentIcon sx={{ fontSize: '0.95rem !important', color: `${accent} !important` }} />}
                label={`${user.streak}d`}
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            )}
            {user && (
              <Chip
                icon={<BoltIcon sx={{ fontSize: '0.95rem !important', color: `${accent} !important` }} />}
                label={user.xp.toLocaleString()}
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            )}
            {user && (
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  {user.username[0].toUpperCase()}
                </Avatar>
              </IconButton>
            )}
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            py: { xs: 3, sm: 4, md: 5 },
            px: { xs: 0, sm: 0 },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>

      {user && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { minWidth: 200, mt: 1 } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography fontWeight={600}>{user.username}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip label={`Lv. ${user.level}`} size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
            </Box>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              navigate('/profile');
              setAnchorEl(null);
            }}
            sx={{ gap: 1.5, py: 1 }}
          >
            <PersonIcon fontSize="small" /> Profile
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1, color: 'error.light' }}>
            <LogoutIcon fontSize="small" /> Sign out
          </MenuItem>
        </Menu>
      )}
    </Box>
  );
}
