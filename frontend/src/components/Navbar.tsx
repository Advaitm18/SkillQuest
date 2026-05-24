import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Box, Button, Avatar, IconButton,
  Menu, MenuItem, Divider, Chip, alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import BoltIcon from '@mui/icons-material/Bolt';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { label: 'Home', path: '/dashboard', icon: <DashboardIcon sx={{ fontSize: 18 }} /> },
  { label: 'Skills', path: '/skills', icon: <AccountTreeIcon sx={{ fontSize: 18 }} /> },
  { label: 'Analytics', path: '/analytics', icon: <QueryStatsIcon sx={{ fontSize: 18 }} /> },
  { label: 'Ranks', path: '/leaderboard', icon: <EmojiEventsIcon sx={{ fontSize: 18 }} /> },
];

const LANDING_ANCHORS = [
  { label: 'About', id: 'about' },
  { label: 'Features', id: 'features' },
  { label: 'Tracks', id: 'tracks' },
  { label: 'How it works', id: 'how-it-works' },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Navbar() {
  const theme = useTheme();
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [landingMenuEl, setLandingMenuEl] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
    setAnchorEl(null);
  };

  const accent = theme.palette.primary.main;
  const isLanding = location.pathname === '/';

  const barBg =
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.78)
      : alpha(theme.palette.background.paper, 0.92);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: barBg,
        backdropFilter: 'blur(16px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.1)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: 1300,
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 5 }, minHeight: 58 }}>

        {/* ── LEFT: brand (always) + app nav when authenticated ── */}
        <Typography
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          sx={{
            fontFamily: '"Literata", Georgia, serif',
            fontWeight: 700,
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
            cursor: 'pointer',
            userSelect: 'none',
            color: 'text.primary',
            flexShrink: 0,
          }}
        >
          SkillQuest
        </Typography>

        {/* App nav links (authenticated, desktop) — left of centre */}
        {isAuthenticated && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.25, ml: 2 }}>
            {NAV_LINKS.map((link) => {
              const active =
                link.path === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
              return (
                <Button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  startIcon={link.icon}
                  size="small"
                  sx={{
                    color: active ? 'text.primary' : 'text.secondary',
                    fontWeight: active ? 600 : 500,
                    borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
                    borderRadius: 0,
                    px: 1.25,
                    py: 1,
                    minWidth: 0,
                    '&:hover': { background: 'transparent', color: 'text.primary' },
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Box>
        )}

        {/* Spacer — pushes everything after it to the right */}
        <Box sx={{ flexGrow: 1 }} />

        {/* ── RIGHT: landing anchors (desktop) ── */}
        {!isAuthenticated && isLanding && (
          <>
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.25, mr: 1 }}>
              {LANDING_ANCHORS.map((a) => (
                <Button
                  key={a.id}
                  size="small"
                  onClick={() => scrollToSection(a.id)}
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 500,
                    minWidth: 0,
                    px: 1.25,
                    py: 0.75,
                    borderRadius: 1.5,
                    fontSize: '0.875rem',
                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                  }}
                >
                  {a.label}
                </Button>
              ))}
            </Box>

            {/* Mobile hamburger */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, mr: 0.5 }}>
              <IconButton
                size="small"
                onClick={(e) => setLandingMenuEl(e.currentTarget)}
                sx={{ color: 'text.secondary' }}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={landingMenuEl}
                open={Boolean(landingMenuEl)}
                onClose={() => setLandingMenuEl(null)}
              >
                {LANDING_ANCHORS.map((a) => (
                  <MenuItem
                    key={a.id}
                    onClick={() => { scrollToSection(a.id); setLandingMenuEl(null); }}
                  >
                    {a.label}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </>
        )}

        {/* ── RIGHT: theme toggle + user actions ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <ThemeToggle />

          {isAuthenticated && user ? (
            <>
              {user.streak > 0 && (
                <Chip
                  icon={<LocalFireDepartmentIcon sx={{ fontSize: '0.95rem !important', color: `${accent} !important` }} />}
                  label={`${user.streak}d`}
                  size="small"
                  sx={{
                    bgcolor: alpha(accent, 0.1),
                    border: `1px solid ${alpha(accent, 0.25)}`,
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
              )}
              <Chip
                icon={<BoltIcon sx={{ fontSize: '0.95rem !important', color: `${accent} !important` }} />}
                label={user.xp.toLocaleString()}
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  border: `1px solid ${theme.palette.divider}`,
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: alpha(accent, 0.14),
                    color: 'primary.main',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: `1px solid ${alpha(accent, 0.3)}`,
                  }}
                >
                  {user.username[0].toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{ sx: { minWidth: 200, mt: 1 } }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography fontWeight={600}>{user.username}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip label={`Lv. ${user.level}`} size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
                  </Box>
                </Box>
                <Divider />
                <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }} sx={{ gap: 1.5, py: 1 }}>
                  <PersonIcon fontSize="small" /> Profile
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1, color: 'error.light' }}>
                  <LogoutIcon fontSize="small" /> Sign out
                </MenuItem>
              </Menu>
            </>
          ) : (
            !isLanding && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" onClick={() => navigate('/login')}>Sign in</Button>
                <Button variant="contained" size="small" onClick={() => navigate('/signup')}>Create account</Button>
              </Box>
            )
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
