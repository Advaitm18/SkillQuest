import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuthStore } from '../store/authStore';
import Navbar from './Navbar';
import AuthenticatedLayout from './AuthenticatedLayout';

const PUBLIC_PATHS = new Set(['/', '/login', '/signup']);

export default function AppShell() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const isPublic = PUBLIC_PATHS.has(location.pathname);

  if (isAuthenticated && !isPublic) {
    return <AuthenticatedLayout><Outlet /></AuthenticatedLayout>;
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      {/* Push content below fixed navbar (58px) */}
      <Box component="main" sx={{ flex: 1, mt: '58px', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
