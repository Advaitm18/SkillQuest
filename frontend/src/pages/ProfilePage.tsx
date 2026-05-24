import React, { useEffect, useState } from 'react';
import {
  Box, Container, Grid, Card, CardContent, Typography,
  Chip, Avatar, LinearProgress, CircularProgress,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import type { Achievement } from '../types';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -3, scale: 1.03 }}
    >
      <Card
        sx={{
          p: 0.5, textAlign: 'center',
          border: achievement.is_rare ? '1px solid rgba(251,191,36,0.4) !important' : undefined,
          background: achievement.is_rare ? 'rgba(251,191,36,0.05) !important' : undefined,
        }}
      >
        <CardContent sx={{ pb: '12px !important' }}>
          {achievement.is_rare && (
            <Chip label="RARE" size="small" sx={{ mb: 1, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', fontWeight: 700, fontSize: '0.65rem' }} />
          )}
          <Typography fontSize="2.5rem" mb={1}>{achievement.icon}</Typography>
          <Typography fontWeight={700} variant="body1" mb={0.5}>{achievement.name}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.5}>
            {achievement.description}
          </Typography>
          {achievement.xp_bonus > 0 && (
            <Chip
              icon={<BoltIcon sx={{ fontSize: '0.75rem !important', color: '#fbbf24 !important' }} />}
              label={`+${achievement.xp_bonus} XP`}
              size="small"
              sx={{ mt: 1, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontWeight: 700 }}
            />
          )}
          {achievement.earned_at && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              Earned {new Date(achievement.earned_at).toLocaleDateString()}
            </Typography>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getAchievements().then((data) => {
      setAchievements(data);
      setLoading(false);
    });
  }, []);

  if (!user) return null;

  const xpForLevel = (level: number) => Array.from({ length: level }, (_, i) => (i + 1) * 80).reduce((a, b) => a + b, 0);
  const xpAtStart = xpForLevel(user.level - 1);
  const xpNeeded = user.level * 80;
  const progressPct = Math.min(((user.xp - xpAtStart) / xpNeeded) * 100, 100);
  const levelColor = user.level >= 30 ? '#fbbf24' : user.level >= 15 ? '#06b6d4' : '#8b5cf6';

  return (
    <Container maxWidth="lg" sx={{ py: 0 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Profile Hero */}
        <Card
          sx={{
            mb: 4, p: 1,
            background: `linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))`,
            border: `1px solid rgba(139,92,246,0.25) !important`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {/* Avatar */}
              <motion.div whileHover={{ scale: 1.05, rotate: 5 }}>
                <Avatar
                  sx={{
                    width: 100, height: 100,
                    background: `linear-gradient(135deg, ${levelColor}, #06b6d4)`,
                    fontSize: '2.5rem', fontWeight: 900,
                    boxShadow: `0 0 40px ${levelColor}40`,
                    border: `3px solid ${levelColor}60`,
                  }}
                >
                  {user.username[0].toUpperCase()}
                </Avatar>
              </motion.div>

              {/* Info */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h4" fontWeight={800}>{user.username}</Typography>
                  <Chip
                    icon={<EmojiEventsIcon sx={{ fontSize: '1rem !important', color: `${levelColor} !important` }} />}
                    label={`Level ${user.level}`}
                    sx={{ background: `${levelColor}20`, color: levelColor, fontWeight: 700, border: `1px solid ${levelColor}40` }}
                  />
                </Box>
                <Typography color="text.secondary" mb={2}>{user.email}</Typography>

                {/* XP Progress */}
                <Box sx={{ maxWidth: 400 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      Level {user.level} Progress
                    </Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: levelColor }}>
                      {Math.round(progressPct)}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progressPct} sx={{ height: 10 }} />
                  <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                    {user.xp.toLocaleString()} total XP • {xpNeeded - (user.xp - xpAtStart)} XP to Level {user.level + 1}
                  </Typography>
                </Box>
              </Box>

              {/* Stat badges */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalFireDepartmentIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                  <Box>
                    <Typography fontWeight={700} lineHeight={1}>{user.streak}</Typography>
                    <Typography variant="caption" color="text.secondary">day streak</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BoltIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
                  <Box>
                    <Typography fontWeight={700} lineHeight={1}>{user.xp.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">total XP</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon sx={{ color: '#06b6d4', fontSize: 20 }} />
                  <Box>
                    <Typography fontWeight={700} lineHeight={1}>{user.longest_streak}</Typography>
                    <Typography variant="caption" color="text.secondary">best streak</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Questions Answered', value: user.total_questions_answered, color: '#8b5cf6' },
          { label: 'Correct Answers', value: user.total_correct_answers, color: '#10b981' },
          { label: 'Accuracy', value: `${user.accuracy}%`, color: user.accuracy >= 70 ? '#10b981' : '#f59e0b' },
          { label: 'Achievements', value: achievements.length, color: '#fbbf24' },
        ].map((stat, i) => (
          <Grid item xs={6} md={3} key={i}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card sx={{ textAlign: 'center', p: 1 }}>
                <CardContent>
                  <Typography variant="h4" fontWeight={800} sx={{ color: stat.color }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Typography variant="h5" fontWeight={800} mb={0.5}>
          Achievements
        </Typography>
        <Typography color="text.secondary" mb={3}>
          {achievements.length > 0
            ? `${achievements.length} earned — keep going!`
            : 'Complete quizzes to earn achievements!'}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : achievements.length > 0 ? (
          <Grid container spacing={2}>
            {achievements.map((ach, i) => (
              <Grid item xs={6} sm={4} md={3} key={ach.id}>
                <AchievementCard achievement={ach} index={i} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card sx={{ textAlign: 'center', py: 6 }}>
            <Typography fontSize="3rem" mb={2}>🏆</Typography>
            <Typography variant="h6" fontWeight={700} mb={1}>No achievements yet</Typography>
            <Typography color="text.secondary">Answer questions and maintain streaks to unlock achievements!</Typography>
          </Card>
        )}
      </motion.div>
    </Container>
  );
}
