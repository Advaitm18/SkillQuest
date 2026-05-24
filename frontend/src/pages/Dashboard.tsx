import React, { useEffect, useState } from 'react';
import {
  Box, Container, Grid, Card, CardContent, Typography,
  Button, LinearProgress, Chip, Avatar, Skeleton, alpha, Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillTrackIcon } from '../utils/skillIcons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { skillService } from '../services/skillService';
import { quizService } from '../services/quizService';
import type { Skill, Recommendation, ResumePoint } from '../types';
import BoltIcon from '@mui/icons-material/Bolt';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ReplayIcon from '@mui/icons-material/Replay';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
/* ─── Helpers ─────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── XP progress bar ─────────────────────────────────────────────── */
function XPBar({ xp, level }: { xp: number; level: number }) {
  const xpForThisLevel = level * 80;
  const xpAtLevelStart = Array.from({ length: level - 1 }, (_, i) => (i + 1) * 80).reduce(
    (a, b) => a + b, 0
  );
  const progress = Math.min(((xp - xpAtLevelStart) / xpForThisLevel) * 100, 100);
  const xpNeeded = xpForThisLevel - (xp - xpAtLevelStart);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          Lv {level}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {xpNeeded > 0 ? `${xpNeeded} XP to next level` : 'Max level!'}
        </Typography>
      </Box>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        style={{ transformOrigin: 'left' }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 99 }} />
      </motion.div>
      <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
        {xp.toLocaleString()} XP total
      </Typography>
    </Box>
  );
}

/* ─── Resume card (horizontal, compact) ──────────────────────────── */
function ContinueCard({
  point, skill, index,
}: { point: ResumePoint; skill: Skill | undefined; index: number }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const c = skill?.color ?? theme.palette.primary.main;

  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1.75,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.18s, background 0.18s',
          '&:hover': {
            borderColor: alpha(c, 0.45),
            bgcolor: alpha(c, theme.palette.mode === 'dark' ? 0.04 : 0.03),
          },
        }}
      >
        {/* Left colour strip */}
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: alpha(c, 0.7) }} />

        {/* Icon */}
        <Box
          sx={{
            width: 38, height: 38, borderRadius: 1.5, flexShrink: 0, ml: 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(c, theme.palette.mode === 'dark' ? 0.15 : 0.1),
            border: `1px solid ${alpha(c, 0.28)}`,
          }}
        >
          <SkillTrackIcon name={point.domain} color={c} size={20} />
        </Box>

        {/* Text */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} noWrap sx={{ fontSize: '0.875rem', lineHeight: 1.3 }}>
            {point.domain}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: 'block', mt: 0.15 }}
          >
            {point.topic} · {timeAgo(point.last_attempted_at)}
          </Typography>
        </Box>

        {/* Action */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<ReplayIcon sx={{ fontSize: '0.85rem !important' }} />}
          onClick={() =>
            navigate(`/quiz/${encodeURIComponent(point.topic)}?domain=${encodeURIComponent(point.domain)}`)
          }
          sx={{ flexShrink: 0, fontSize: '0.78rem', py: 0.6, px: 1.5, borderRadius: 1.5 }}
        >
          Resume
        </Button>
      </Box>
    </motion.div>
  );
}

/* ─── Skill card ──────────────────────────────────────────────────── */
function SkillCard({ skill, index }: { skill: Skill; index: number }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const progress = skill.total_nodes > 0 ? (skill.completed_nodes / skill.total_nodes) * 100 : 0;
  const done = skill.completed_nodes === skill.total_nodes && skill.total_nodes > 0;
  const c = skill.color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        onClick={() => navigate(`/skills/${skill.id}`)}
        sx={{ cursor: 'pointer', height: '100%', transition: 'all 0.2s' }}
      >
        <CardContent sx={{ p: 2.5 }}>
          {/* Icon + badge row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                width: 46, height: 46, borderRadius: 2,
                bgcolor: alpha(c, theme.palette.mode === 'dark' ? 0.14 : 0.1),
                border: `1px solid ${alpha(c, 0.3)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SkillTrackIcon name={skill.name} color={c} size={26} />
            </Box>
            {done ? (
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
            ) : (
              <Chip
                label={skill.difficulty}
                size="small"
                sx={{
                  bgcolor: alpha(c, 0.1), color: c,
                  border: `1px solid ${alpha(c, 0.25)}`,
                  fontWeight: 600, fontSize: '0.68rem', height: 22,
                }}
              />
            )}
          </Box>

          {/* Name + desc */}
          <Typography fontWeight={700} mb={0.5} sx={{ fontSize: '0.9375rem' }}>
            {skill.name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            mb={2}
            sx={{ lineHeight: 1.55, fontSize: '0.8125rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {skill.description}
          </Typography>

          {/* Progress */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
              <Typography variant="caption" color="text.secondary">
                {skill.completed_nodes}/{skill.total_nodes} nodes
              </Typography>
              <Typography variant="caption" fontWeight={600} sx={{ color: c }}>
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 5, borderRadius: 99,
                bgcolor: alpha(c, 0.12),
                '& .MuiLinearProgress-bar': { backgroundColor: c, borderRadius: 99 },
              }}
            />
          </Box>

          {skill.user_xp_in_skill > 0 && (
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, mt: 1.25, display: 'block' }}>
              <BoltIcon sx={{ fontSize: 11, mr: 0.3, verticalAlign: 'middle' }} />
              {skill.user_xp_in_skill} XP earned
            </Typography>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [resumePoints, setResumePoints] = useState<ResumePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [skillsData, recsData, resumeData] = await Promise.all([
          skillService.getSkills(),
          quizService.getRecommendations(),
          quizService.getResumePoints(),
        ]);
        setSkills(skillsData);
        setRecommendations(recsData.recommendations);
        setResumePoints(resumeData.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const skillForDomain = (domain: string) => skills.find((s) => s.name === domain);

  const levelColor =
    user && user.level >= 30
      ? theme.palette.primary.main
      : user && user.level >= 15
        ? theme.palette.secondary.main
        : theme.palette.info.main;

  const STATS = [
    { label: 'Streak', value: user?.streak ?? 0, unit: 'days', icon: <LocalFireDepartmentIcon sx={{ fontSize: 18 }} />, color: theme.palette.primary.main },
    { label: 'Accuracy', value: `${user?.accuracy ?? 0}%`, unit: 'overall', icon: <TrendingUpIcon sx={{ fontSize: 18 }} />, color: theme.palette.success.main },
    { label: 'Answered', value: user?.total_questions_answered ?? 0, unit: 'questions', icon: <AccountTreeIcon sx={{ fontSize: 18 }} />, color: theme.palette.info.main },
    { label: 'Correct', value: user?.total_correct_answers ?? 0, unit: 'answers', icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: theme.palette.secondary.main },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 0 }}>

      {/* ══════════════ 1. HEADER + PROFILE CARD ══════════════ */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }}>
        <Card sx={{ mb: 3, overflow: 'hidden', position: 'relative' }}>
          {/* Ambient wash */}
          <Box
            sx={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse at 95% 50%, ${alpha(levelColor, theme.palette.mode === 'dark' ? 0.08 : 0.06)} 0%, transparent 60%)`,
            }}
          />
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Grid container spacing={3} alignItems="center">
              {/* Left: greeting + XP */}
              <Grid item xs={12} md={5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                  <Avatar
                    sx={{
                      width: 52, height: 52,
                      bgcolor: alpha(levelColor, 0.18),
                      color: levelColor,
                      border: `1.5px solid ${alpha(levelColor, 0.4)}`,
                      fontWeight: 800, fontSize: '1.1rem',
                      flexShrink: 0,
                    }}
                  >
                    {user?.username[0].toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: '0.04em' }}>
                      {greeting()}
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.1 }}>
                      {user?.username}
                    </Typography>
                    <Chip
                      icon={<EmojiEventsIcon sx={{ fontSize: '0.85rem !important', color: `${levelColor} !important` }} />}
                      label={`Level ${user?.level}`}
                      size="small"
                      sx={{
                        mt: 0.4, height: 20, fontSize: '0.7rem', fontWeight: 700,
                        bgcolor: alpha(levelColor, 0.12), color: levelColor,
                        border: `1px solid ${alpha(levelColor, 0.28)}`,
                      }}
                    />
                  </Box>
                </Box>
                {user && <XPBar xp={user.xp} level={user.level} />}
              </Grid>

              {/* Divider (desktop) */}
              <Grid item md={0.5} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
                <Divider orientation="vertical" flexItem sx={{ height: 96, borderColor: 'divider' }} />
              </Grid>

              {/* Right: 4 stats */}
              <Grid item xs={12} md={6.5}>
                <Grid container spacing={2}>
                  {STATS.map((s, i) => (
                    <Grid item xs={6} sm={3} key={s.label}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                      >
                        <Box sx={{ textAlign: { xs: 'left', sm: 'center' } }}>
                          <Box sx={{ color: s.color, display: 'flex', justifyContent: { xs: 'flex-start', sm: 'center' }, mb: 0.5 }}>
                            {s.icon}
                          </Box>
                          <Typography fontWeight={800} sx={{ fontSize: { xs: '1.35rem', md: '1.6rem' }, lineHeight: 1.1 }}>
                            {s.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {s.unit}
                          </Typography>
                        </Box>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {/* ══════════════ 2. CONTINUE / START ══════════════ */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>

          {/* Left: resume list OR quick-start */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <AnimatePresence mode="wait">
                  {resumePoints.length > 0 ? (
                    <motion.div key="resume" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography fontWeight={700} sx={{ fontSize: '0.9375rem' }}>
                          Continue learning
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {resumePoints.length} track{resumePoints.length > 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {resumePoints.map((pt, i) => (
                          <ContinueCard
                            key={pt.domain}
                            point={pt}
                            skill={skillForDomain(pt.domain)}
                            index={i}
                          />
                        ))}
                      </Box>
                    </motion.div>
                  ) : (
                    <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Typography fontWeight={700} mb={0.5} sx={{ fontSize: '0.9375rem' }}>
                        Start learning
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={2.5}>
                        Pick a track below to begin. Your progress is saved between sessions.
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {recommendations.slice(0, 3).map((rec, i) => (
                          <motion.div key={i} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                            <Button
                              variant={i === 0 ? 'contained' : 'outlined'}
                              size="small"
                              startIcon={<PlayArrowIcon />}
                              onClick={() =>
                                navigate(`/quiz/${encodeURIComponent(rec.topic)}?domain=${encodeURIComponent(rec.topic)}`)
                              }
                              sx={{ borderRadius: 2 }}
                            >
                              {rec.topic}
                            </Button>
                          </motion.div>
                        ))}
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </Grid>

          {/* Right: suggested next */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography fontWeight={700} mb={2} sx={{ fontSize: '0.9375rem' }}>
                  Suggested next
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recommendations.slice(0, 4).map((rec, i) => (
                    <motion.div
                      key={rec.topic}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.06 }}
                    >
                      <Box
                        onClick={() =>
                          navigate(`/quiz/${encodeURIComponent(rec.topic)}?domain=${encodeURIComponent(rec.topic)}`)
                        }
                        sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 1, p: 1.25, borderRadius: 1.5, cursor: 'pointer',
                          border: `1px solid transparent`,
                          transition: 'all 0.16s',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            border: `1px solid ${theme.palette.divider}`,
                          },
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={600} noWrap sx={{ fontSize: '0.8375rem' }}>
                            {rec.topic}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rec.reason}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                          {rec.reason === 'Needs practice' && (
                            <Chip
                              label="Weak spot"
                              size="small"
                              sx={{
                                height: 18, fontSize: '0.65rem',
                                bgcolor: alpha(theme.palette.error.main, 0.12),
                                color: 'error.main',
                              }}
                            />
                          )}
                          <PlayArrowIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>

      {/* ══════════════ 3. SKILL TRACKS ══════════════ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography fontWeight={700} sx={{ fontSize: '0.9375rem' }}>
              Skill tracks
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {skills.filter(s => s.completed_nodes > 0).length} of {skills.length} started
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<AccountTreeIcon sx={{ fontSize: '0.9rem !important' }} />}
            onClick={() => navigate('/skills')}
            sx={{ color: 'primary.main', fontSize: '0.8125rem' }}
          >
            Browse all
          </Button>
        </Box>

        <Grid container spacing={2}>
          {loading
            ? [...Array(8)].map((_, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Skeleton variant="rectangular" height={190} sx={{ borderRadius: 2 }} />
                </Grid>
              ))
            : skills.map((skill, i) => (
                <Grid item xs={12} sm={6} md={3} key={skill.id}>
                  <SkillCard skill={skill} index={i} />
                </Grid>
              ))}
        </Grid>
      </motion.div>
    </Container>
  );
}
