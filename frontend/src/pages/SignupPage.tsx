import React, { useState } from 'react';
import {
  Box, Container, Card, CardContent, Typography,
  TextField, Button, Link, Alert, CircularProgress, InputAdornment, IconButton,
  LinearProgress, alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function PasswordStrength({ password }: { password: string }) {
  const theme = useTheme();
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };
  const strength = getStrength();
  const colors = [
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.primary.main,
  ];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;
  return (
    <Box sx={{ mt: -1 }}>
      <LinearProgress
        variant="determinate"
        value={(strength / 4) * 100}
        sx={{
          height: 4, borderRadius: 2,
          '& .MuiLinearProgress-bar': { background: colors[strength - 1] || theme.palette.error.main },
        }}
      />
      <Typography variant="caption" sx={{ color: colors[strength - 1] || theme.palette.error.main, fontWeight: 600 }}>
        {labels[strength - 1] || 'Very Weak'}
      </Typography>
    </Box>
  );
}

export default function SignupPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await authService.signup(form);
      setAuth(data.user, data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    'AI-generated questions every session',
    'Adaptive difficulty that grows with you',
    'XP, levels, and achievement system',
    'Personal analytics dashboard',
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `radial-gradient(ellipse at 70% 40%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 60%)`,
        py: 4,
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
              Create your account
            </Typography>
            <Typography color="text.secondary" mt={0.75}>
              Start your learning journey today
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
                <TextField
                  label="Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  fullWidth
                  inputProps={{ minLength: 3, maxLength: 30 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                  }}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  fullWidth
                  autoComplete="email"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                  }}
                />
                <Box>
                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    fullWidth
                    autoComplete="new-password"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <PasswordStrength password={form.password} />
                </Box>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    size="large"
                    sx={{ py: 1.5, mt: 0.5, borderRadius: '12px' }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
                  </Button>
                </motion.div>
              </Box>

              {/* Benefits */}
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {benefits.map((b, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                    <Typography variant="caption" color="text.secondary">{b}</Typography>
                  </Box>
                ))}
              </Box>

              <Typography textAlign="center" mt={3} color="text.secondary" variant="body2">
                Already have an account?{' '}
                <Link component={RouterLink} to="/login" sx={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Sign in
                </Link>
              </Typography>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
}
