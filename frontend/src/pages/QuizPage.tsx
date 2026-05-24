import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Button,
  Chip, LinearProgress, CircularProgress, TextField, Collapse, alpha, Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuizStore, SESSION_LENGTH, MAX_LIVES } from '../store/quizStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { quizService } from '../services/quizService';
import type { DifficultyLevel } from '../types';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BoltIcon from '@mui/icons-material/Bolt';
import TimerIcon from '@mui/icons-material/Timer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import StarIcon from '@mui/icons-material/Star';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ReplayIcon from '@mui/icons-material/Replay';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

// ─── Difficulty config ────────────────────────────────────────────────────────
const DIFF_CONFIG: Record<DifficultyLevel, {
  label: string; color: string; bg: string; timer: number; icon: React.ReactNode;
}> = {
  easy:         { label: 'Easy',         color: '#10b981', bg: 'rgba(16,185,129,0.12)',  timer: 60,  icon: <SchoolIcon sx={{ fontSize: 13 }} /> },
  intermediate: { label: 'Intermediate', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', timer: 80,  icon: <WhatshotIcon sx={{ fontSize: 13 }} /> },
  pro:          { label: 'Pro',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   timer: 100, icon: <StarIcon sx={{ fontSize: 13 }} /> },
  mastery:      { label: 'Mastery',      color: '#a855f7', bg: 'rgba(168,85,247,0.12)', timer: 120, icon: <EmojiEventsIcon sx={{ fontSize: 13 }} /> },
};

const DIFF_ORDER: DifficultyLevel[] = ['easy', 'intermediate', 'pro', 'mastery'];

// ─── Session progress dots ────────────────────────────────────────────────────
function SessionProgress({
  answered, total, history,
}: { answered: number; total: number; history: { correct: boolean }[] }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < history.length;
        const correct = done ? history[i].correct : null;
        const isNext = i === answered;
        return (
          <motion.div
            key={i}
            initial={done ? { scale: 0.5 } : {}}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: done ? 0 : 0 }}
          >
            <Box
              sx={{
                width: isNext ? 22 : 14,
                height: 8,
                borderRadius: 4,
                transition: 'all 0.3s',
                background: correct === true
                  ? '#10b981'
                  : correct === false
                  ? '#ef4444'
                  : isNext
                  ? 'rgba(255,255,255,0.35)'
                  : 'rgba(255,255,255,0.12)',
                boxShadow: correct === true
                  ? '0 0 6px rgba(16,185,129,0.5)'
                  : correct === false
                  ? '0 0 6px rgba(239,68,68,0.4)'
                  : 'none',
              }}
            />
          </motion.div>
        );
      })}
      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 600 }}>
        {answered}/{total}
      </Typography>
    </Box>
  );
}

// ─── Lives display ────────────────────────────────────────────────────────────
function LivesDisplay({ lives, shaking }: { lives: number; shaking: boolean }) {
  return (
    <motion.div
      animate={shaking ? { x: [0, -6, 6, -5, 5, -3, 3, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <motion.div
            key={i}
            animate={i >= lives ? { scale: [1, 0.6, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {i < lives ? (
              <FavoriteIcon sx={{ fontSize: 18, color: '#ef4444', filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }} />
            ) : (
              <FavoriteBorderIcon sx={{ fontSize: 18, color: 'rgba(239,68,68,0.25)' }} />
            )}
          </motion.div>
        ))}
      </Box>
    </motion.div>
  );
}

// ─── Combo badge ──────────────────────────────────────────────────────────────
function ComboBadge({ combo }: { combo: number }) {
  if (combo < 2) return null;
  const scale = Math.min(1 + (combo - 2) * 0.04, 1.25);
  const color = combo >= 8 ? '#a855f7' : combo >= 5 ? '#ef4444' : combo >= 3 ? '#f59e0b' : '#10b981';
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={combo}
        initial={{ scale: 0.5, opacity: 0, y: 6 }}
        animate={{ scale, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      >
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            px: 1.2, py: 0.4, borderRadius: '20px',
            background: alpha(color, 0.15),
            border: `1px solid ${alpha(color, 0.4)}`,
          }}
        >
          <LocalFireDepartmentIcon sx={{ fontSize: 14, color }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color, lineHeight: 1 }}>
            {combo}× streak
          </Typography>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function Timer({ onTimeout, totalSeconds }: { onTimeout: () => void; totalSeconds: number }) {
  const [seconds, setSeconds] = useState(totalSeconds);

  useEffect(() => { setSeconds(totalSeconds); }, [totalSeconds]);
  useEffect(() => {
    if (seconds <= 0) { onTimeout(); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const frac = seconds / totalSeconds;
  const color = frac > 0.5 ? '#10b981' : frac > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <TimerIcon sx={{ color, fontSize: 17, flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate" value={frac * 100}
          sx={{ height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { background: color, transition: 'width 1s linear, background 0.3s' } }}
        />
      </Box>
      <Typography fontWeight={700} sx={{ color, minWidth: 30, textAlign: 'right', fontSize: '0.82rem' }}>
        {seconds}s
      </Typography>
    </Box>
  );
}

// ─── XP popup ────────────────────────────────────────────────────────────────
function XPPopup({ xp }: { xp: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.3 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      style={{ position: 'absolute', top: 0, right: 20, zIndex: 10, pointerEvents: 'none' }}
    >
      <Typography fontWeight={800} sx={{ color: '#fbbf24', fontSize: '1.3rem', textShadow: '0 0 20px rgba(251,191,36,0.8)' }}>
        +{xp} XP ⚡
      </Typography>
    </motion.div>
  );
}

// ─── Difficulty roadmap ───────────────────────────────────────────────────────
function DifficultyRoadmap({ current }: { current: DifficultyLevel }) {
  const idx = DIFF_ORDER.indexOf(current);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {DIFF_ORDER.map((lvl, i) => {
        const cfg = DIFF_CONFIG[lvl];
        const active = i === idx;
        const done = i < idx;
        return (
          <React.Fragment key={lvl}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: active ? 1.1 : 0.7, py: 0.35, borderRadius: '20px',
              background: active ? cfg.bg : 'transparent',
              border: `1px solid ${active ? cfg.color : done ? alpha(cfg.color, 0.25) : 'transparent'}`,
              opacity: done ? 0.65 : active ? 1 : 0.3,
              transition: 'all 0.3s',
            }}>
              <Box sx={{ color: cfg.color, display: 'flex', alignItems: 'center' }}>{cfg.icon}</Box>
              {active && (
                <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
                  {cfg.label}
                </Typography>
              )}
            </Box>
            {i < DIFF_ORDER.length - 1 && (
              <Box sx={{ width: 10, height: 1.5, background: i < idx ? alpha(DIFF_CONFIG[DIFF_ORDER[i]].color, 0.4) : 'rgba(255,255,255,0.1)', borderRadius: 1 }} />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

// ─── Session Complete screen ──────────────────────────────────────────────────
function SessionCompleteScreen({
  topic, domain, questionsAnswered, correctAnswers, sessionXP, maxCombo,
  highestDifficulty, sessionHistory, endReason, onRestart, onDashboard,
}: {
  topic: string; domain?: string;
  questionsAnswered: number; correctAnswers: number; sessionXP: number;
  maxCombo: number; highestDifficulty: DifficultyLevel;
  sessionHistory: { correct: boolean; difficulty: DifficultyLevel; xp: number }[];
  endReason: 'completed' | 'lives_out' | null;
  onRestart: () => void; onDashboard: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;

  const grade = accuracy >= 90 ? { label: 'S', color: '#a855f7', title: 'Outstanding!', sub: 'You absolutely crushed it. Mastery-level thinking.' }
    : accuracy >= 75 ? { label: 'A', color: '#10b981', title: 'Excellent work!', sub: 'Strong performance — you\'re building real expertise.' }
    : accuracy >= 60 ? { label: 'B', color: '#f59e0b', title: 'Good session!', sub: 'Solid foundations. Review the explanations to push higher.' }
    : accuracy >= 40 ? { label: 'C', color: '#ef4444', title: 'Keep going!', sub: 'Learning takes reps. Every wrong answer is a lesson learned.' }
    : { label: 'D', color: '#6b7280', title: 'Don\'t give up!', sub: 'Hard topics require repetition. Start with easier questions to build confidence.' };

  const gradeIcon = accuracy >= 75
    ? <SentimentSatisfiedAltIcon sx={{ fontSize: 28, color: grade.color }} />
    : accuracy >= 50
    ? <SentimentNeutralIcon sx={{ fontSize: 28, color: grade.color }} />
    : <SentimentVeryDissatisfiedIcon sx={{ fontSize: 28, color: grade.color }} />;

  const highestCfg = DIFF_CONFIG[highestDifficulty];

  const statItems = [
    { label: 'XP Earned', value: `+${sessionXP}`, unit: 'XP', icon: <BoltIcon sx={{ fontSize: 20, color: '#fbbf24' }} />, color: '#fbbf24' },
    { label: 'Accuracy', value: `${accuracy}%`, unit: `${correctAnswers}/${questionsAnswered}`, icon: <TrendingUpIcon sx={{ fontSize: 20, color: '#10b981' }} />, color: '#10b981' },
    { label: 'Best Streak', value: maxCombo, unit: 'in a row', icon: <LocalFireDepartmentIcon sx={{ fontSize: 20, color: '#f59e0b' }} />, color: '#f59e0b' },
    { label: 'Peak Level', value: highestCfg.label, unit: 'difficulty', icon: <Box sx={{ color: highestCfg.color, display: 'flex' }}>{highestCfg.icon}</Box>, color: highestCfg.color },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card sx={{ overflow: 'hidden', position: 'relative' }}>
        {/* Ambient glow */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 0%, ${alpha(grade.color, 0.1)} 0%, transparent 65%)`,
        }} />

        {/* Top accent */}
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${grade.color}, ${alpha(grade.color, 0.4)})` }} />

        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{
                width: 64, height: 64, borderRadius: '20px', flexShrink: 0,
                background: alpha(grade.color, 0.15), border: `2px solid ${alpha(grade.color, 0.4)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {endReason === 'lives_out'
                  ? <FavoriteBorderIcon sx={{ fontSize: 30, color: '#ef4444' }} />
                  : accuracy >= 75
                  ? <MilitaryTechIcon sx={{ fontSize: 30, color: grade.color }} />
                  : gradeIcon}
              </Box>
              <Box sx={{ flex: 1 }}>
                {endReason === 'lives_out' && (
                  <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 0.3 }}>
                    Out of lives
                  </Typography>
                )}
                <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                  {endReason === 'lives_out' ? 'Session ended early' : grade.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, lineHeight: 1.5 }}>
                  {endReason === 'lives_out'
                    ? `You answered ${questionsAnswered} questions. Practice those tricky spots!`
                    : grade.sub}
                </Typography>
              </Box>
              {/* Grade badge */}
              <Box sx={{
                width: 52, height: 52, borderRadius: '16px', flexShrink: 0,
                background: alpha(grade.color, 0.15), border: `2px solid ${alpha(grade.color, 0.35)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography fontWeight={900} sx={{ color: grade.color, fontSize: '1.5rem', lineHeight: 1 }}>
                  {grade.label}
                </Typography>
              </Box>
            </Box>
          </motion.div>

          {/* Stats grid */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {statItems.map((s, i) => (
              <Grid item xs={6} sm={3} key={s.label}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Box sx={{
                    p: 1.8, borderRadius: '14px', textAlign: 'center',
                    background: isDark ? alpha(s.color, 0.07) : alpha(s.color, 0.05),
                    border: `1px solid ${alpha(s.color, 0.2)}`,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.6 }}>{s.icon}</Box>
                    <Typography fontWeight={800} sx={{ fontSize: '1.35rem', lineHeight: 1.1, color: s.color }}>
                      {s.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.2 }}>
                      {s.unit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                      {s.label}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Answer history dots */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            <Box sx={{
              p: 2, borderRadius: '12px',
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              mb: 3,
            }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1.2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                Your answers
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', alignItems: 'center' }}>
                {sessionHistory.map((r, i) => {
                  const cfg = DIFF_CONFIG[r.difficulty];
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.45 + i * 0.04, type: 'spring', stiffness: 400 }}
                    >
                      <Box sx={{
                        position: 'relative',
                        width: 28, height: 28, borderRadius: '8px',
                        background: r.correct ? alpha('#10b981', 0.15) : alpha('#ef4444', 0.12),
                        border: `1.5px solid ${r.correct ? alpha('#10b981', 0.5) : alpha('#ef4444', 0.4)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {r.correct
                          ? <CheckCircleIcon sx={{ fontSize: 14, color: '#10b981' }} />
                          : <CancelIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
                        {/* difficulty dot */}
                        <Box sx={{
                          position: 'absolute', bottom: 1, right: 1,
                          width: 5, height: 5, borderRadius: '50%',
                          background: cfg.color,
                        }} />
                      </Box>
                    </motion.div>
                  );
                })}
                {/* Remaining (if lives_out) */}
                {endReason === 'lives_out' && Array.from({ length: SESSION_LENGTH - sessionHistory.length }).map((_, i) => (
                  <Box key={`empty-${i}`} sx={{
                    width: 28, height: 28, borderRadius: '8px',
                    border: `1.5px dashed rgba(255,255,255,0.15)`,
                    opacity: 0.4,
                  }} />
                ))}
              </Box>
              <Box sx={{ mt: 1.2, display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 1, background: '#10b981' }} />
                  <Typography variant="caption" color="text.secondary">{correctAnswers} correct</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 1, background: '#ef4444' }} />
                  <Typography variant="caption" color="text.secondary">{questionsAnswered - correctAnswers} wrong</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                  {DIFF_ORDER.map(d => (
                    <Box key={d} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: DIFF_CONFIG[d].color }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{DIFF_CONFIG[d].label[0]}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </motion.div>

          {/* CTA buttons */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                variant="contained" size="large" fullWidth
                startIcon={<ReplayIcon />}
                onClick={onRestart}
                sx={{
                  py: 1.7, borderRadius: '13px', fontWeight: 700,
                  background: `linear-gradient(135deg, ${grade.color}, ${alpha(grade.color, 0.75)})`,
                  '&:hover': { filter: 'brightness(1.1)' },
                }}
              >
                Start new session
              </Button>
              <Button
                variant="outlined" size="large" fullWidth
                startIcon={<DashboardIcon />}
                onClick={onDashboard}
                sx={{ py: 1.7, borderRadius: '13px', fontWeight: 600 }}
              >
                Dashboard
              </Button>
            </Box>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function QuizPage() {
  const { topic } = useParams<{ topic: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { updateUser } = useAuthStore();
  const { showLevelUp } = useUIStore();
  const {
    currentQuestion, feedback, currentDifficulty,
    questionsAnswered, correctAnswers, sessionXP,
    lives, combo, maxCombo, sessionComplete, sessionEndReason,
    highestDifficulty, sessionHistory,
    setQuestion, setFeedback, setLoading, nextQuestion, isLoading, resetSession,
  } = useQuizStore();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [startTime, setStartTime] = useState(Date.now());
  const [showXPPopup, setShowXPPopup] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [prevLives, setPrevLives] = useState(MAX_LIVES);
  const livesShaking = lives < prevLives;

  // Track every question ID served in this session to exclude from subsequent requests
  const seenIdsRef = useRef<number[]>([]);

  const decodedTopic = topic ? decodeURIComponent(topic) : 'Machine Learning';
  const domain = searchParams.get('domain')?.trim() || undefined;
  const diffCfg = DIFF_CONFIG[currentDifficulty] ?? DIFF_CONFIG.easy;

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setSelectedOption(null);
    setTextAnswer('');
    setHintVisible(false);
    setTimerKey((k) => k + 1);
    try {
      const q = await quizService.getQuestion(
        decodedTopic,
        currentDifficulty,
        domain,
        'learn',
        seenIdsRef.current,
      );
      seenIdsRef.current = [...seenIdsRef.current, q.id];
      setQuestion(q);
      setStartTime(Date.now());
    } catch (err) {
      console.error('Failed to load question:', err);
    } finally {
      setLoading(false);
    }
  }, [decodedTopic, currentDifficulty, domain]);

  useEffect(() => {
    seenIdsRef.current = [];
    resetSession();
    loadQuestion();
  }, [decodedTopic, domain]);

  // Track life changes for shake animation
  useEffect(() => {
    if (lives < prevLives) {
      const t = setTimeout(() => setPrevLives(lives), 500);
      return () => clearTimeout(t);
    }
    setPrevLives(lives);
  }, [lives]);

  const handleSubmit = async (timeoutFail = false) => {
    if (!currentQuestion) return;

    let answer: string;
    if (timeoutFail) {
      // Timeout: auto-fail — submit empty (will be marked wrong)
      answer = '__timeout__';
    } else {
      answer = currentQuestion.question_type === 'mcq' ? selectedOption || '' : textAnswer;
      if (!answer.trim()) return;
    }

    const timeTaken = (Date.now() - startTime) / 1000;
    try {
      const result = await quizService.submitAnswer({
        question_id: currentQuestion.id,
        user_answer: answer,
        time_taken_seconds: timeTaken,
        topic: decodedTopic,
      });
      setFeedback(result);
      updateUser({ xp: result.new_total_xp, level: result.new_level });
      if (result.xp_earned > 0) setShowXPPopup(true);
      if (result.leveled_up) setTimeout(() => showLevelUp(result.new_level), 800);
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const handleNext = () => {
    if (sessionComplete) return;
    setShowXPPopup(false);
    nextQuestion();
    loadQuestion();
  };

  const handleRestart = () => {
    seenIdsRef.current = [];
    resetSession();
    loadQuestion();
  };

  const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;

  // ── Session complete ──────────────────────────────────────────────────────
  if (sessionComplete) {
    return (
      <Container maxWidth="md" sx={{ py: 2 }}>
        <SessionCompleteScreen
          topic={decodedTopic}
          domain={domain}
          questionsAnswered={questionsAnswered}
          correctAnswers={correctAnswers}
          sessionXP={sessionXP}
          maxCombo={maxCombo}
          highestDifficulty={highestDifficulty}
          sessionHistory={sessionHistory}
          endReason={sessionEndReason}
          onRestart={handleRestart}
          onDashboard={() => navigate('/dashboard')}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 0 }}>
      {/* ── Top bar ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            size="small"
            sx={{ color: 'text.secondary', minWidth: 'auto' }}
          >
            Exit
          </Button>

          <DifficultyRoadmap current={currentDifficulty} />

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ComboBadge combo={combo} />
            <LivesDisplay lives={lives} shaking={livesShaking} />
            {sessionXP > 0 && (
              <Chip
                icon={<BoltIcon sx={{ fontSize: '0.85rem !important', color: '#fbbf24 !important' }} />}
                label={`${sessionXP} XP`}
                size="small"
                sx={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontWeight: 700 }}
              />
            )}
          </Box>
        </Box>
      </motion.div>

      {/* ── Session progress bar ── */}
      <Box sx={{ mb: 2.5 }}>
        <SessionProgress
          answered={questionsAnswered}
          total={SESSION_LENGTH}
          history={sessionHistory}
        />
      </Box>

      {/* ── Topic / domain chips ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {domain && (
          <Chip label={domain} size="small"
            sx={{ background: alpha(theme.palette.primary.main, 0.12), color: 'primary.light', fontWeight: 600 }} />
        )}
        <Chip label={decodedTopic} variant="outlined" size="small" sx={{ fontWeight: 500 }} />
      </Box>

      {/* ── Question card ── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <Box key="loader" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2 }}>
            <CircularProgress color="primary" size={36} />
            <Typography variant="body2" color="text.secondary">Generating question…</Typography>
          </Box>
        ) : currentQuestion ? (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card sx={{ mb: 2.5, position: 'relative', overflow: 'visible' }}>
              {showXPPopup && feedback && <XPPopup xp={feedback.xp_earned} />}

              {/* Difficulty accent strip */}
              <Box sx={{ height: 3, background: diffCfg.color, borderRadius: '12px 12px 0 0' }} />

              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                {/* Timer */}
                {!feedback && (
                  <Box sx={{ mb: 3 }}>
                    <Timer key={timerKey} onTimeout={() => handleSubmit(true)} totalSeconds={diffCfg.timer} />
                  </Box>
                )}

                {/* Question text */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                  <Box sx={{
                    width: 34, height: 34, borderRadius: '10px',
                    background: alpha(diffCfg.color, 0.14),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, mt: 0.2,
                  }}>
                    <AutoAwesomeIcon sx={{ fontSize: 18, color: diffCfg.color }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} lineHeight={1.65} sx={{ flex: 1 }}>
                    {currentQuestion.question_text}
                  </Typography>
                </Box>

                {/* MCQ options */}
                {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    {currentQuestion.options.map((option, i) => {
                      const isSelected = selectedOption === option;
                      const isCorrect = feedback && option === feedback.correct_answer;
                      const isWrong = feedback && isSelected && !feedback.is_correct;
                      const borderColor = isCorrect ? '#10b981' : isWrong ? '#ef4444' : isSelected ? diffCfg.color
                        : isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.12)';
                      const bgColor = isCorrect ? alpha('#10b981', 0.1) : isWrong ? alpha('#ef4444', 0.08)
                        : isSelected ? alpha(diffCfg.color, 0.1) : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
                      return (
                        <motion.div
                          key={i}
                          animate={isWrong ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                          transition={{ duration: 0.4 }}
                          whileHover={!feedback ? { scale: 1.008, x: 3 } : {}}
                          whileTap={!feedback ? { scale: 0.996 } : {}}
                        >
                          <Box
                            onClick={() => !feedback && setSelectedOption(option)}
                            sx={{
                              p: { xs: 1.5, md: 2 }, borderRadius: '13px',
                              cursor: feedback ? 'default' : 'pointer',
                              border: `1.5px solid ${borderColor}`,
                              background: bgColor,
                              display: 'flex', alignItems: 'center', gap: 2,
                              transition: 'all 0.15s',
                            }}
                          >
                            <Box sx={{
                              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                              border: `1.5px solid ${isCorrect ? '#10b981' : isWrong ? '#ef4444' : isSelected ? diffCfg.color : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isCorrect ? alpha('#10b981', 0.18) : isWrong ? alpha('#ef4444', 0.18) : isSelected ? alpha(diffCfg.color, 0.18) : 'transparent',
                            }}>
                              {isCorrect ? <CheckCircleIcon sx={{ fontSize: 17, color: '#10b981' }} />
                                : isWrong ? <CancelIcon sx={{ fontSize: 17, color: '#ef4444' }} />
                                : <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{['A', 'B', 'C', 'D'][i]}</Typography>}
                            </Box>
                            <Typography fontWeight={isSelected || isCorrect ? 600 : 400} sx={{ fontSize: '0.95rem' }}>
                              {option}
                            </Typography>
                          </Box>
                        </motion.div>
                      );
                    })}
                  </Box>
                )}

                {/* Text answer */}
                {currentQuestion.question_type === 'text' && (
                  <TextField
                    multiline rows={4} fullWidth
                    placeholder="Type your answer here…"
                    value={textAnswer}
                    onChange={(e) => !feedback && setTextAnswer(e.target.value)}
                    disabled={!!feedback}
                    sx={{ mt: 1 }}
                  />
                )}

                {/* Hint */}
                {!feedback && currentQuestion.hint && (
                  <Box sx={{ mt: 2.5 }}>
                    <Button
                      size="small"
                      startIcon={hintVisible ? <LightbulbIcon sx={{ color: '#f59e0b' }} /> : <LightbulbOutlinedIcon />}
                      onClick={() => setHintVisible((v) => !v)}
                      sx={{
                        color: hintVisible ? '#f59e0b' : 'text.secondary',
                        fontSize: '0.8rem', fontWeight: 500,
                        '&:hover': { background: alpha('#f59e0b', 0.08) },
                      }}
                    >
                      {hintVisible ? 'Hide hint' : 'Need a hint?'}
                    </Button>
                    <Collapse in={hintVisible}>
                      <Box sx={{
                        mt: 1.2, p: 2, borderRadius: '12px',
                        background: alpha('#f59e0b', isDark ? 0.08 : 0.06),
                        border: `1px solid ${alpha('#f59e0b', 0.3)}`,
                        display: 'flex', gap: 1.5, alignItems: 'flex-start',
                      }}>
                        <LightbulbIcon sx={{ fontSize: 18, color: '#f59e0b', flexShrink: 0, mt: 0.15 }} />
                        <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.82)' : 'text.primary', lineHeight: 1.7, fontStyle: 'italic' }}>
                          {currentQuestion.hint}
                        </Typography>
                      </Box>
                    </Collapse>
                  </Box>
                )}

                {/* Submit / Next */}
                <Box sx={{ mt: 3 }}>
                  {!feedback ? (
                    <motion.div whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.988 }}>
                      <Button
                        variant="contained" fullWidth size="large"
                        onClick={() => handleSubmit(false)}
                        disabled={currentQuestion.question_type === 'mcq' ? !selectedOption : !textAnswer.trim()}
                        sx={{
                          py: 1.75, borderRadius: '13px', fontSize: '1rem',
                          background: `linear-gradient(135deg, ${diffCfg.color}, ${alpha(diffCfg.color, 0.72)})`,
                          '&:hover': { filter: 'brightness(1.1)' },
                          '&:disabled': { opacity: 0.38 },
                        }}
                      >
                        Submit Answer
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.988 }}>
                      <Button
                        variant="contained" fullWidth size="large"
                        onClick={handleNext}
                        sx={{
                          py: 1.75, borderRadius: '13px', fontSize: '1rem',
                          background: feedback.is_correct
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : `linear-gradient(135deg, ${DIFF_CONFIG[feedback.next_difficulty as DifficultyLevel]?.color ?? diffCfg.color}, ${alpha(DIFF_CONFIG[feedback.next_difficulty as DifficultyLevel]?.color ?? diffCfg.color, 0.72)})`,
                        }}
                      >
                        Next Question →
                      </Button>
                    </motion.div>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Feedback panel */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card sx={{
                    border: `1px solid ${feedback.is_correct ? alpha('#10b981', 0.4) : alpha('#ef4444', 0.4)}`,
                    background: feedback.is_correct ? alpha('#10b981', isDark ? 0.06 : 0.04) : alpha('#ef4444', isDark ? 0.06 : 0.04),
                    overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <Box sx={{
                      px: 3, py: 2,
                      background: feedback.is_correct ? alpha('#10b981', isDark ? 0.12 : 0.08) : alpha('#ef4444', isDark ? 0.12 : 0.08),
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      borderBottom: `1px solid ${feedback.is_correct ? alpha('#10b981', 0.2) : alpha('#ef4444', 0.2)}`,
                    }}>
                      {feedback.is_correct
                        ? <CheckCircleIcon sx={{ color: '#10b981', fontSize: 24 }} />
                        : <CancelIcon sx={{ color: '#ef4444', fontSize: 24 }} />}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: '1rem' }}>
                          {feedback.is_correct
                            ? combo >= 5 ? `${combo}× streak — on fire!` : combo >= 3 ? 'Nice streak! Keep going' : 'Correct!'
                            : lives === 1 ? 'Last life — be careful!' : lives === 0 ? 'Session over' : 'Not quite right'}
                        </Typography>
                        {!feedback.is_correct && lives > 0 && (
                          <Typography variant="caption" sx={{ color: '#ef4444', opacity: 0.8 }}>
                            {lives} {lives === 1 ? 'life' : 'lives'} remaining
                          </Typography>
                        )}
                      </Box>
                      {feedback.xp_earned > 0 && (
                        <Chip
                          icon={<BoltIcon sx={{ fontSize: '0.85rem !important', color: '#fbbf24 !important' }} />}
                          label={`+${feedback.xp_earned} XP`}
                          size="small"
                          sx={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    <CardContent sx={{ p: 2.5 }}>
                      {/* Correct answer (if wrong) */}
                      {!feedback.is_correct && (
                        <Box sx={{
                          mb: 2, p: 2, borderRadius: '10px',
                          background: alpha('#10b981', isDark ? 0.1 : 0.07),
                          border: `1px solid ${alpha('#10b981', 0.35)}`,
                          display: 'flex', gap: 1.5, alignItems: 'flex-start',
                        }}>
                          <CheckCircleIcon sx={{ fontSize: 17, color: '#10b981', flexShrink: 0, mt: 0.1 }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.2 }}>Correct answer</Typography>
                            <Typography fontWeight={600} sx={{ fontSize: '0.93rem' }}>{feedback.correct_answer}</Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Explanation */}
                      {feedback.explanation && (
                        <Box sx={{
                          p: 2.5, borderRadius: '12px',
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                        }}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                              Why this is the answer
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.primary" lineHeight={1.8} sx={{ fontSize: '0.92rem' }}>
                            {feedback.explanation}
                          </Typography>
                        </Box>
                      )}

                      {/* Next difficulty */}
                      {feedback.next_difficulty && (
                        <Box sx={{ mt: 1.8, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">Next:</Typography>
                          {(() => {
                            const nc = DIFF_CONFIG[feedback.next_difficulty as DifficultyLevel] ?? DIFF_CONFIG.easy;
                            const levels = DIFF_ORDER;
                            const isUp = levels.indexOf(feedback.next_difficulty as DifficultyLevel) > levels.indexOf(currentDifficulty);
                            const isSame = feedback.next_difficulty === currentDifficulty;
                            return (
                              <Chip
                                icon={<Box sx={{ display: 'flex', color: nc.color }}>{nc.icon}</Box>}
                                label={`${nc.label}${isUp ? ' ↑' : isSame ? '' : ' ↓'}`}
                                size="small"
                                sx={{ background: nc.bg, color: nc.color, fontWeight: 700, border: `1px solid ${alpha(nc.color, 0.35)}` }}
                              />
                            );
                          })()}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Container>
  );
}
