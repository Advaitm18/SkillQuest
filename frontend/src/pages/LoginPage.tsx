import React, { useState } from 'react';
import {
  Box, Container, Card, CardContent, Typography,
  TextField, Button, Link, Alert, CircularProgress, InputAdornment, IconButton, alpha,
  Divider, Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BoltIcon from '@mui/icons-material/Bolt';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDemoLogin = async () => {
    setError('');
    setDemoLoading(true);
    try {
      const data = await authService.demoLogin();
      setAuth(data.user, data.access_token);
      navigate('/dashboard');
    } catch {
      setError('Demo account unavailable — restart the backend to re-seed it.');
    } finally {
      setDemoLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleChange = (field: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.login(form);
      setAuth(data.user, data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 400 || status === 422) {
        setError('Incorrect email or password.');
        triggerShake();
      } else if (!err.response) {
        setError('Cannot reach the server. Make sure the backend is running.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `radial-gradient(ellipse at 30% 40%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 60%)`,
      }}
    >
      <Container maxWidth="xs">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', letterSpacing: '0.12em', fontWeight: 600, fontSize: '0.7rem' }}
            >
              SkillQuest
            </Typography>
            <Typography variant="h4" fontWeight={700} mt={0.5} sx={{ fontFamily: '"Literata", Georgia, serif' }}>
              Welcome back
            </Typography>
            <Typography color="text.secondary" mt={0.75}>
              Continue your learning journey
            </Typography>
          </Box>

          <Card>
            <CardContent sx={{ p: 4 }}>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>
                </motion.div>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <motion.div
                  animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                  transition={{ duration: 0.45 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  error={!!error}
                  required
                  fullWidth
                  autoComplete="email"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: error ? 'error.main' : 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                  }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  error={!!error}
                  required
                  fullWidth
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: error ? 'error.main' : 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    size="large"
                    sx={{ py: 1.5, mt: 1, borderRadius: '12px' }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                  </Button>
                </motion.div>
              </Box>

              {/* Divider */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 3 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                  or
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              {/* Demo login button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ marginTop: 12 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={handleDemoLogin}
                  disabled={demoLoading}
                  startIcon={demoLoading
                    ? <CircularProgress size={16} color="inherit" />
                    : <WorkspacePremiumIcon sx={{ fontSize: '1.1rem !important' }} />
                  }
                  sx={{
                    py: 1.4, borderRadius: '12px', fontWeight: 700,
                    borderColor: alpha('#c9a227', 0.45),
                    color: '#c9a227',
                    background: alpha('#c9a227', 0.05),
                    '&:hover': {
                      borderColor: '#c9a227',
                      background: alpha('#c9a227', 0.1),
                    },
                    gap: 1,
                  }}
                >
                  {demoLoading ? 'Loading…' : 'Try Demo Account'}
                </Button>
              </motion.div>

              {/* Demo account badge */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.8, mt: 1.5, flexWrap: 'wrap' }}>
                {[
                  { icon: '👑', label: 'Level 50' },
                  { icon: '⚡', label: '9 999 XP' },
                  { icon: '🔥', label: '30-day streak' },
                  { icon: '🏆', label: 'All achievements' },
                ].map(b => (
                  <Chip
                    key={b.label}
                    label={`${b.icon} ${b.label}`}
                    size="small"
                    sx={{
                      fontSize: '0.68rem', fontWeight: 600,
                      background: alpha('#c9a227', 0.08),
                      color: 'text.secondary',
                      border: `1px solid ${alpha('#c9a227', 0.18)}`,
                    }}
                  />
                ))}
              </Box>

              <Typography textAlign="center" mt={3} color="text.secondary" variant="body2">
                Don't have an account?{' '}
                <Link component={RouterLink} to="/signup" sx={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Sign up free
                </Link>
              </Typography>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
}
