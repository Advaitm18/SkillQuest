import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Snackbar, Alert, useTheme } from '@mui/material';
import { createAppTheme } from './theme';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';

import AppShell from './components/AppShell';
import PageTransitionLayout from './components/PageTransitionLayout';
import LevelUpModal from './components/LevelUpModal';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import SkillsListPage from './pages/SkillsListPage';
import SkillTreePage from './pages/SkillTreePage';
import QuizPage from './pages/QuizPage';
import RapidFirePage from './pages/RapidFirePage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';

function NotificationStack() {
  const theme = useTheme();
  const { notifications, removeNotification } = useUIStore();
  return (
    <>
      {notifications.map((n, i) => (
        <Snackbar
          key={n.id}
          open
          autoHideDuration={4000}
          onClose={() => removeNotification(n.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: `${(i * 70) + 24}px !important` }}
        >
          <Alert
            severity={n.type}
            onClose={() => removeNotification(n.id)}
            sx={{
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              backgroundColor:
                theme.palette.mode === 'dark' ? 'rgba(26, 24, 22, 0.88)' : 'rgba(250, 248, 245, 0.95)',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            {n.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}

function ThemedApp() {
  const mode = useThemeStore((s) => s.mode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route element={<PageTransitionLayout />}>
              <Route path="/" element={<RootRedirect />} />
              <Route
                path="/login"
                element={
                  <AuthGate>
                    <LoginPage />
                  </AuthGate>
                }
              />
              <Route
                path="/signup"
                element={
                  <AuthGate>
                    <SignupPage />
                  </AuthGate>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skills"
                element={
                  <ProtectedRoute>
                    <SkillsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skills/:id"
                element={
                  <ProtectedRoute>
                    <SkillTreePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/:topic"
                element={
                  <ProtectedRoute>
                    <QuizPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rapid-fire/:domain"
                element={
                  <ProtectedRoute>
                    <RapidFirePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <LeaderboardPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>

      <LevelUpModal />
      <NotificationStack />
    </ThemeProvider>
  );
}

function RootRedirect() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPage />;
}

export default function App() {
  return <ThemedApp />;
}

/** Redirect to dashboard if already logged in (login/signup only). */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
