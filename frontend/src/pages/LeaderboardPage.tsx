import React, { useEffect, useState } from 'react';
import {
  Box, Container, Card, CardContent, Typography,
  Avatar, Chip, CircularProgress, LinearProgress,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import type { LeaderboardEntry } from '../types';
import BoltIcon from '@mui/icons-material/Bolt';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const RANK_COLORS: Record<number, string> = {
  1: '#fbbf24',
  2: '#94a3b8',
  3: '#f97316',
};
const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getLeaderboard(20).then((data) => {
      setEntries(data.entries || []);
      setCurrentRank(data.current_user_rank);
      setLoading(false);
    });
  }, []);

  const maxXP = entries[0]?.xp || 1;

  return (
    <Container maxWidth="md" sx={{ py: 0 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography fontSize="3rem" mb={1}>🏆</Typography>
          <Typography variant="h4" fontWeight={800} mb={0.5}>Leaderboard</Typography>
          <Typography color="text.secondary">Top learners this week</Typography>
          {currentRank && (
            <Chip
              label={`You're ranked #${currentRank}`}
              sx={{ mt: 2, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', fontWeight: 700 }}
            />
          )}
        </Box>
      </motion.div>

      {/* Top 3 Podium */}
      {!loading && entries.length >= 3 && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2, mb: 5 }}>
            {[entries[1], entries[0], entries[2]].map((entry, podiumI) => {
              const actualRank = podiumI === 0 ? 2 : podiumI === 1 ? 1 : 3;
              const heights = [120, 160, 100];
              const color = RANK_COLORS[actualRank];
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + podiumI * 0.1 }}
                  whileHover={{ y: -6 }}
                >
                  <Box sx={{ textAlign: 'center', width: 120 }}>
                    <Typography fontSize="1.5rem" mb={0.5}>{RANK_ICONS[actualRank]}</Typography>
                    <Avatar
                      sx={{
                        width: 52, height: 52, mx: 'auto', mb: 1,
                        background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                        border: `2px solid ${color}60`, fontWeight: 800, fontSize: '1.25rem',
                      }}
                    >
                      {entry.username[0].toUpperCase()}
                    </Avatar>
                    <Typography fontWeight={700} variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {entry.username}
                    </Typography>
                    <Box
                      sx={{
                        mt: 1, height: heights[podiumI], borderRadius: '14px 14px 0 0',
                        background: `linear-gradient(180deg, ${color}30, ${color}10)`,
                        border: `1px solid ${color}40`,
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', pt: 1.5,
                      }}
                    >
                      <Typography fontWeight={800} sx={{ color }}>
                        {entry.xp.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
          </Box>
        </motion.div>
      )}

      {/* Full Leaderboard */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {entries.map((entry, i) => {
            const isCurrentUser = entry.user_id === user?.id;
            const rankColor = RANK_COLORS[entry.rank];
            const xpProgress = (entry.xp / maxXP) * 100;

            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 4 }}
              >
                <Card
                  sx={{
                    p: 0,
                    border: isCurrentUser ? '1px solid rgba(139,92,246,0.4) !important' : undefined,
                    background: isCurrentUser ? 'rgba(139,92,246,0.06) !important' : undefined,
                  }}
                >
                  <CardContent sx={{ py: '14px !important', px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Rank */}
                      <Box sx={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                        {entry.rank <= 3 ? (
                          <Typography fontSize="1.5rem">{RANK_ICONS[entry.rank]}</Typography>
                        ) : (
                          <Typography fontWeight={800} sx={{ color: 'text.secondary' }}>#{entry.rank}</Typography>
                        )}
                      </Box>

                      {/* Avatar */}
                      <Avatar
                        sx={{
                          width: 44, height: 44, flexShrink: 0,
                          background: `linear-gradient(135deg, ${rankColor || '#8b5cf6'}, #06b6d4)`,
                          fontWeight: 700, fontSize: '1rem',
                        }}
                      >
                        {entry.username[0].toUpperCase()}
                      </Avatar>

                      {/* Name + XP bar */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography fontWeight={700} sx={{ color: isCurrentUser ? '#a78bfa' : '#f1f5f9' }}>
                            {entry.username}
                          </Typography>
                          {isCurrentUser && (
                            <Chip label="You" size="small" sx={{ height: 18, background: 'rgba(139,92,246,0.2)', color: '#a78bfa', fontWeight: 700, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={xpProgress}
                          sx={{
                            height: 4,
                            '& .MuiLinearProgress-bar': {
                              background: rankColor
                                ? `linear-gradient(90deg, ${rankColor}, ${rankColor}aa)`
                                : 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                            },
                          }}
                        />
                      </Box>

                      {/* Stats */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        {entry.streak > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocalFireDepartmentIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#fbbf24' }}>{entry.streak}</Typography>
                          </Box>
                        )}
                        <Box sx={{ textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BoltIcon sx={{ fontSize: 16, color: '#a78bfa' }} />
                            <Typography fontWeight={800} sx={{ color: rankColor || '#f1f5f9' }}>
                              {entry.xp.toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">Lv.{entry.level}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </Box>
      )}

      {entries.length === 0 && !loading && (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <Typography fontSize="3rem" mb={2}>🏆</Typography>
          <Typography variant="h6" fontWeight={700} mb={1}>No entries yet</Typography>
          <Typography color="text.secondary">Be the first to earn XP and claim the top spot!</Typography>
        </Card>
      )}
    </Container>
  );
}
