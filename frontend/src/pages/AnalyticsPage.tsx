import React, { useEffect, useState } from 'react';
import {
  Box, Container, Grid, Card, CardContent, Typography,
  Chip, CircularProgress, LinearProgress,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  CartesianGrid,
} from 'recharts';
import { userService } from '../services/userService';
import type { AnalyticsData } from '../types';
import BoltIcon from '@mui/icons-material/Bolt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SchoolIcon from '@mui/icons-material/School';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ p: 1.5, background: 'rgba(13,13,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}>
      <Typography variant="body2" fontWeight={700}>{label}</Typography>
      {payload.map((p: any, i: number) => (
        <Typography key={i} variant="caption" sx={{ color: p.color, display: 'block' }}>
          {p.name}: {p.value}
        </Typography>
      ))}
    </Box>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getAnalytics().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!data) return null;

  const radarData = Object.entries(data.accuracy_by_topic).map(([topic, acc]) => ({
    subject: topic.length > 10 ? topic.slice(0, 10) + '…' : topic,
    accuracy: acc,
    fullMark: 100,
  }));

  const topicBarData = Object.entries(data.accuracy_by_topic).map(([topic, acc]) => ({
    topic: topic.length > 15 ? topic.slice(0, 15) + '…' : topic,
    accuracy: acc,
    fill: acc >= 80 ? '#10b981' : acc >= 50 ? '#f59e0b' : '#ef4444',
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 0 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="h4" fontWeight={800} mb={0.5}>Analytics</Typography>
        <Typography color="text.secondary" mb={4}>Your learning performance at a glance</Typography>
      </motion.div>

      {/* KPI Cards */}
      <Grid container spacing={{ xs: 2.5, md: 3.5 }} sx={{ mb: { xs: 4, md: 5 } }}>
        {[
          { label: 'Total XP', value: data.total_xp.toLocaleString(), icon: <BoltIcon />, color: '#8b5cf6', sub: 'experience points' },
          { label: 'Current Level', value: `Level ${data.current_level}`, icon: <SchoolIcon />, color: '#06b6d4', sub: 'keep going!' },
          { label: 'Accuracy', value: `${data.accuracy}%`, icon: <TrendingUpIcon />, color: data.accuracy >= 70 ? '#10b981' : '#f59e0b', sub: 'overall' },
          { label: 'Streak', value: `${data.streak} 🔥`, icon: <LocalFireDepartmentIcon />, color: '#f59e0b', sub: 'days' },
        ].map((kpi, i) => (
          <Grid item xs={6} md={3} key={i}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card sx={{ p: 0.5 }}>
                <CardContent>
                  <Box sx={{ color: kpi.color, mb: 1 }}>{kpi.icon}</Box>
                  <Typography variant="h5" fontWeight={800}>{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={{ xs: 2.5, md: 3.5 }}>
        {/* Accuracy by Topic Bar Chart */}
        {topicBarData.length > 0 && (
          <Grid item xs={12} md={8}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card sx={{ p: 0.5 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={3}>Accuracy by Topic</Typography>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={topicBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="topic" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="accuracy" name="Accuracy %" radius={[6, 6, 0, 0]}>
                        {topicBarData.map((entry, i) => (
                          <rect key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* Radar Chart */}
        {radarData.length >= 3 && (
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card sx={{ p: 0.5, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={3}>Skill Radar</Typography>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Radar name="Accuracy" dataKey="accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* Weak Topics */}
        {data.weak_topics.length > 0 && (
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card sx={{ p: 0.5, border: '1px solid rgba(239,68,68,0.2) !important' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WarningIcon sx={{ color: '#ef4444' }} />
                    <Typography variant="h6" fontWeight={700}>Needs Practice</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.weak_topics.map((topic) => (
                      <Chip
                        key={topic}
                        label={topic}
                        sx={{
                          background: 'rgba(239,68,68,0.1)', color: '#f87171',
                          border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600,
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    Focus on these topics to boost your overall accuracy.
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* Strong Topics */}
        {data.strong_topics.length > 0 && (
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card sx={{ p: 0.5, border: '1px solid rgba(16,185,129,0.2) !important' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CheckCircleIcon sx={{ color: '#10b981' }} />
                    <Typography variant="h6" fontWeight={700}>You're Crushing It</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.strong_topics.map((topic) => (
                      <Chip
                        key={topic}
                        label={topic}
                        sx={{
                          background: 'rgba(16,185,129,0.1)', color: '#34d399',
                          border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600,
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    Outstanding performance! Keep exploring advanced topics.
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* Recent Activity */}
        {data.recent_attempts.length > 0 && (
          <Grid item xs={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card sx={{ p: 0.5 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>Recent Activity</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {data.recent_attempts.slice(0, 8).map((attempt, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <Box
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 2,
                            p: 1.5, borderRadius: '12px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {attempt.is_correct ? (
                            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20, flexShrink: 0 }} />
                          ) : (
                            <CancelIcon sx={{ color: '#ef4444', fontSize: 20, flexShrink: 0 }} />
                          )}
                          <Typography fontWeight={600} sx={{ flex: 1 }}>{attempt.topic}</Typography>
                          <Chip
                            label={attempt.difficulty}
                            size="small"
                            sx={{
                              background: 'rgba(255,255,255,0.06)',
                              fontSize: '0.7rem', fontWeight: 600,
                            }}
                          />
                          {attempt.xp_earned > 0 && (
                            <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 700 }}>
                              +{attempt.xp_earned} XP
                            </Typography>
                          )}
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        )}

        {/* Empty state */}
        {data.total_questions === 0 && (
          <Grid item xs={12}>
            <Card sx={{ textAlign: 'center', p: 4 }}>
              <Typography fontSize="3rem" mb={2}>📊</Typography>
              <Typography variant="h6" fontWeight={700} mb={1}>No data yet</Typography>
              <Typography color="text.secondary">Complete some quizzes to see your analytics!</Typography>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
