import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Button,
  Chip, CircularProgress, alpha, Grid, LinearProgress,
} from '@mui/material';
import AIInterviewerModal from '../components/AIInterviewerModal';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { quizService } from '../services/quizService';
import type { Question, AnswerFeedback } from '../types';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BoltIcon from '@mui/icons-material/Bolt';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TimerIcon from '@mui/icons-material/Timer';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import SkipNextIcon from '@mui/icons-material/SkipNext';

const TOTAL_QUESTIONS = 10;
const TIMER_SECONDS   = 30;
const AUTO_ADVANCE_MS = 3000; // ms after answering before auto-next

interface AnswerRecord {
  correct: boolean;
  timeTaken: number;
  xp: number;
  questionText: string;
  correctAnswer: string;
  userAnswer: string;
  explanation?: string;
}

// ─── Circular countdown ───────────────────────────────────────────────────────
function CircularTimer({ seconds, total }: { seconds: number; total: number }) {
  const frac = seconds / total;
  const size = 80;
  const r    = 32;
  const circ = 2 * Math.PI * r;
  const dash = circ * frac;
  const color = frac > 0.5 ? '#10b981' : frac > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography fontWeight={800} sx={{ color, fontSize: '1.1rem', lineHeight: 1 }}>
          {seconds}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Auto-advance countdown bar ───────────────────────────────────────────────
function AutoAdvanceBar({ ms, onDone }: { ms: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(ms);

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const t = setInterval(() => setRemaining((r) => r - 50), 50);
    return () => clearInterval(t);
  }, [remaining]);

  return (
    <LinearProgress
      variant="determinate"
      value={(remaining / ms) * 100}
      sx={{
        height: 3, borderRadius: 0,
        '& .MuiLinearProgress-bar': { background: '#a855f7', transition: 'width 0.05s linear' },
      }}
    />
  );
}

// ─── Session report ───────────────────────────────────────────────────────────
function InterviewReport({
  domain, answered, correct, history, totalXP,
  onRetry, onDashboard,
}: {
  domain: string; answered: number; correct: number;
  history: AnswerRecord[]; totalXP: number;
  onRetry: () => void; onDashboard: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accuracy    = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const avgTime     = history.length > 0 ? Math.round(history.reduce((s, r) => s + r.timeTaken, 0) / history.length) : 0;
  const speedScore  = Math.max(0, Math.round(100 - (avgTime / TIMER_SECONDS) * 60));

  // Composite readiness score: 70% accuracy + 30% speed
  const readiness = Math.round(accuracy * 0.7 + speedScore * 0.3);

  const grade =
    readiness >= 85 ? { label: 'Interview Ready',  color: '#10b981', sub: 'Strong performance. You can walk into most MAANG screens with confidence.', badge: 'READY' }
    : readiness >= 70 ? { label: 'Nearly There',    color: '#f59e0b', sub: 'Solid foundations. Sharpen a few weak spots and you\'ll be ready.', badge: 'CLOSE' }
    : readiness >= 50 ? { label: 'Keep Practicing', color: '#ef4444', sub: 'Good effort. Focus on the questions you missed and retry.', badge: 'GRIND' }
    :                   { label: 'More Study Needed', color: '#6b7280', sub: 'Don\'t worry — review the explanations below and build from here.', badge: 'STUDY' };

  const stats = [
    { label: 'Readiness',  value: `${readiness}%`, icon: <WorkspacePremiumIcon sx={{ fontSize: 20, color: grade.color }} />, color: grade.color },
    { label: 'Accuracy',   value: `${accuracy}%`,  icon: <TrendingUpIcon sx={{ fontSize: 20, color: '#10b981' }} />, color: '#10b981' },
    { label: 'Avg Speed',  value: `${avgTime}s`,   icon: <SpeedIcon sx={{ fontSize: 20, color: '#f59e0b' }} />, color: '#f59e0b' },
    { label: 'XP Earned',  value: `+${totalXP}`,   icon: <BoltIcon sx={{ fontSize: 20, color: '#fbbf24' }} />, color: '#fbbf24' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}>
      {/* Header card */}
      <Card sx={{ mb: 2.5, overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${grade.color}, ${alpha(grade.color, 0.4)})` }} />
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 0%, ${alpha(grade.color, 0.08)} 0%, transparent 60%)` }} />
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: '22px', flexShrink: 0,
              background: alpha(grade.color, 0.14), border: `2px solid ${alpha(grade.color, 0.4)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <EmojiEventsIcon sx={{ fontSize: 34, color: grade.color }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: grade.color, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 0.3 }}>
                {domain} · Rapid Fire Report
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                {grade.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, lineHeight: 1.5 }}>
                {grade.sub}
              </Typography>
            </Box>
            <Box sx={{
              width: 58, height: 58, borderRadius: '18px', flexShrink: 0,
              background: alpha(grade.color, 0.14), border: `2px solid ${alpha(grade.color, 0.35)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography fontWeight={900} sx={{ color: grade.color, fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.2 }}>
                {grade.badge}
              </Typography>
            </Box>
          </Box>

          {/* Stats */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {stats.map((s, i) => (
              <Grid item xs={6} sm={3} key={s.label}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.07 }}>
                  <Box sx={{
                    p: 1.8, borderRadius: '14px', textAlign: 'center',
                    background: alpha(s.color, isDark ? 0.08 : 0.05),
                    border: `1px solid ${alpha(s.color, 0.22)}`,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.6 }}>{s.icon}</Box>
                    <Typography fontWeight={800} sx={{ fontSize: '1.4rem', color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.2, fontSize: '0.7rem' }}>{s.label}</Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Answer replay */}
          <Box sx={{
            p: 2, borderRadius: '12px', mb: 3,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1.2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
              Answer recap — {correct}/{answered} correct
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
              {history.map((r, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 400 }}>
                  <Box sx={{
                    width: 30, height: 30, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: r.correct ? alpha('#10b981', 0.14) : alpha('#ef4444', 0.12),
                    border: `1.5px solid ${r.correct ? alpha('#10b981', 0.45) : alpha('#ef4444', 0.4)}`,
                    cursor: 'default', position: 'relative',
                  }}>
                    {r.correct
                      ? <CheckCircleIcon sx={{ fontSize: 14, color: '#10b981' }} />
                      : <CancelIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
                    <Box sx={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: 5, height: 5, borderRadius: '50%',
                      background: r.timeTaken <= 10 ? '#a855f7' : r.timeTaken <= 20 ? '#f59e0b' : '#6b7280',
                    }} />
                  </Box>
                </motion.div>
              ))}
            </Box>
          </Box>

          {/* Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="contained" size="large" fullWidth
              startIcon={<ReplayIcon />} onClick={onRetry}
              sx={{
                py: 1.7, borderRadius: '13px', fontWeight: 700,
                background: `linear-gradient(135deg, ${grade.color}, ${alpha(grade.color, 0.72)})`,
                '&:hover': { filter: 'brightness(1.1)' },
              }}
            >
              Try again
            </Button>
            <Button
              variant="outlined" size="large" fullWidth
              startIcon={<DashboardIcon />} onClick={onDashboard}
              sx={{ py: 1.7, borderRadius: '13px', fontWeight: 600 }}
            >
              Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Wrong answers — review section */}
      {history.filter(r => !r.correct).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem', px: 0.5 }}>
            Review — questions you missed
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {history.filter(r => !r.correct).map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 + i * 0.08 }}>
                <Card sx={{ border: `1px solid ${alpha('#ef4444', 0.2)}`, background: alpha('#ef4444', isDark ? 0.04 : 0.02) }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5, lineHeight: 1.5 }}>
                      {r.questionText}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: r.explanation ? 1.5 : 0, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<CancelIcon sx={{ fontSize: '0.85rem !important', color: '#ef4444 !important' }} />}
                        label={`You: ${r.userAnswer}`} size="small"
                        sx={{ background: alpha('#ef4444', 0.1), color: '#ef4444', fontWeight: 500, maxWidth: 280, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                      />
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important', color: '#10b981 !important' }} />}
                        label={`Correct: ${r.correctAnswer}`} size="small"
                        sx={{ background: alpha('#10b981', 0.1), color: '#10b981', fontWeight: 600, maxWidth: 280, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                      />
                    </Box>
                    {r.explanation && (
                      <Box sx={{
                        p: 2, borderRadius: '10px', mt: 1,
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                      }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.8 }}>
                          <InfoOutlinedIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                          <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Why
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.primary" lineHeight={1.75} sx={{ fontSize: '0.88rem' }}>
                          {r.explanation}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </Box>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RapidFirePage() {
  const { domain } = useParams<{ domain: string }>();
  const navigate   = useNavigate();
  const theme      = useTheme();
  const isDark     = theme.palette.mode === 'dark';
  const { updateUser } = useAuthStore();

  const decodedDomain = domain ? decodeURIComponent(domain) : 'Machine Learning';

  // Session state
  const [question,      setQuestion]      = useState<Question | null>(null);
  const [feedback,      setFeedback]      = useState<AnswerFeedback | null>(null);
  const [selected,      setSelected]      = useState<string | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [history,       setHistory]       = useState<AnswerRecord[]>([]);
  const [sessionDone,   setSessionDone]   = useState(false);
  const [totalXP,       setTotalXP]       = useState(0);
  const [timerSeconds,  setTimerSeconds]  = useState(TIMER_SECONDS);
  const [timerKey,      setTimerKey]      = useState(0);
  const [autoAdvance,   setAutoAdvance]   = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [interviewMountKey, setInterviewMountKey] = useState(0);
  const seenQuestionIdsRef = useRef<number[]>([]);

  const startTimeRef = useRef(Date.now());
  const answered     = history.length;
  const correct      = history.filter(r => r.correct).length;

  const loadQuestion = useCallback(async () => {
    setIsLoading(true);
    setSelected(null);
    setFeedback(null);
    setAutoAdvance(false);
    setTimerSeconds(TIMER_SECONDS);
    setTimerKey(k => k + 1);
    try {
      const q = await quizService.getQuestion(
        decodedDomain,
        'mastery',
        decodedDomain,
        'interview',
        seenQuestionIdsRef.current,
      );
      seenQuestionIdsRef.current = [...seenQuestionIdsRef.current, q.id];
      setQuestion(q);
      startTimeRef.current = Date.now();
    } catch {
      // will show error state
    } finally {
      setIsLoading(false);
    }
  }, [decodedDomain]);

  useEffect(() => { loadQuestion(); }, []);

  // Countdown timer
  useEffect(() => {
    if (feedback || sessionDone || isLoading) return;
    if (timerSeconds <= 0) { handleSubmit(true); return; }
    const t = setTimeout(() => setTimerSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timerSeconds, feedback, sessionDone, isLoading]);

  const handleSubmit = async (timeout = false) => {
    if (!question || feedback) return;
    const answer = timeout ? '__timeout__' : (selected || '');
    if (!timeout && !answer) return;

    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    try {
      const result = await quizService.submitAnswer({
        question_id: question.id,
        user_answer: answer,
        time_taken_seconds: timeTaken,
        topic: decodedDomain,
      });
      setFeedback(result);
      updateUser({ xp: result.new_total_xp, level: result.new_level });
      setTotalXP(x => x + result.xp_earned);

      setHistory(prev => [...prev, {
        correct: result.is_correct,
        timeTaken: Math.round(timeTaken),
        xp: result.xp_earned,
        questionText: question.question_text,
        correctAnswer: result.correct_answer,
        userAnswer: answer === '__timeout__' ? '(no answer — timed out)' : answer,
        explanation: result.explanation,
      }]);

      // Auto-advance after showing feedback briefly
      setAutoAdvance(true);
    } catch { /* silent */ }
  };

  const handleNext = useCallback(() => {
    if (answered + 1 >= TOTAL_QUESTIONS) {
      setSessionDone(true);
      return;
    }
    loadQuestion();
  }, [answered, loadQuestion]);

  const handleRetry = () => {
    seenQuestionIdsRef.current = [];
    setHistory([]);
    setSessionDone(false);
    setInterviewDone(false);
    setShowInterview(false);
    setTotalXP(0);
    loadQuestion();
  };

  // Derive topics the candidate missed (question texts for wrong answers)
  const topicsMissed = history
    .filter(r => !r.correct)
    .map(r => r.questionText.slice(0, 60))
    .slice(0, 5);

  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  // ── Session complete — show report (after interview is done or skipped) ──
  if (sessionDone && interviewDone) {
    return (
      <Container maxWidth="md" sx={{ py: 2 }}>
        <InterviewReport
          domain={decodedDomain}
          answered={answered}
          correct={correct}
          history={history}
          totalXP={totalXP}
          onRetry={handleRetry}
          onDashboard={() => navigate('/dashboard')}
        />
      </Container>
    );
  }

  // ── Session complete — choose AI interview or skip to report ──────────────
  if (sessionDone && !interviewDone) {
    return (
      <>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card sx={{ overflow: 'hidden', textAlign: 'center' }}>
              <Box sx={{ height: 4, background: 'linear-gradient(90deg, #a855f7, #c9a227)' }} />
              <CardContent sx={{ py: 5, px: 3 }}>
                <EmojiEventsIcon sx={{ fontSize: 52, color: 'primary.main', mb: 1.5 }} />
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  Rapid fire complete
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto', lineHeight: 1.65 }}>
                  You scored {correct}/{answered} ({accuracy}%). Continue to a short live-style AI interview, or jump straight to your detailed report.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 320, mx: 'auto' }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<VideoCallIcon />}
                    onClick={() => {
                      setInterviewMountKey((k) => k + 1);
                      setShowInterview(true);
                    }}
                    sx={{
                      py: 1.5,
                      borderRadius: '12px',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #c9a227, #8b6914)',
                      color: '#141210',
                      '&:hover': { filter: 'brightness(1.06)' },
                    }}
                  >
                    Enter AI interview
                  </Button>
                  <Button
                    variant="text"
                    size="medium"
                    startIcon={<SkipNextIcon />}
                    onClick={() => setInterviewDone(true)}
                    sx={{ color: 'text.secondary', fontWeight: 600 }}
                  >
                    Skip to report
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Container>

        <AIInterviewerModal
          key={interviewMountKey}
          open={showInterview}
          domain={decodedDomain}
          score={accuracy}
          correct={correct}
          total={answered}
          topicsMissed={topicsMissed}
          onClose={() => {
            setShowInterview(false);
            setInterviewDone(true);
          }}
        />
      </>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 0 }}>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} size="small" sx={{ color: 'text.secondary' }}>
            Exit
          </Button>

          {/* Mode badge */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.8,
            px: 1.5, py: 0.6, borderRadius: '20px',
            background: alpha('#a855f7', 0.14),
            border: `1px solid ${alpha('#a855f7', 0.4)}`,
          }}>
            <FlashOnIcon sx={{ fontSize: 14, color: '#a855f7' }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#a855f7', lineHeight: 1, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Rapid Fire
            </Typography>
          </Box>

          <Chip label={decodedDomain} size="small" variant="outlined" sx={{ fontWeight: 600 }} />

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {totalXP > 0 && (
              <Chip
                icon={<BoltIcon sx={{ fontSize: '0.85rem !important', color: '#fbbf24 !important' }} />}
                label={`${totalXP} XP`} size="small"
                sx={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontWeight: 700 }}
              />
            )}
            <Typography variant="body2" fontWeight={700} color="text.secondary">
              {answered}/{TOTAL_QUESTIONS}
            </Typography>
          </Box>
        </Box>
      </motion.div>

      {/* ── Progress bar ── */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 0.6 }}>
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => {
            const done = i < history.length;
            const isCurrent = i === answered;
            return (
              <Box key={i} sx={{
                flex: 1, height: 7, borderRadius: 4,
                transition: 'background 0.3s',
                background: done
                  ? (history[i].correct ? '#10b981' : '#ef4444')
                  : isCurrent
                  ? alpha('#a855f7', 0.45)
                  : 'rgba(255,255,255,0.1)',
                boxShadow: done && history[i].correct ? '0 0 6px rgba(16,185,129,0.4)' : 'none',
              }} />
            );
          })}
        </Box>
      </Box>

      {/* ── Question card ── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <Box key="loader" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12, gap: 2 }}>
            <CircularProgress sx={{ color: '#a855f7' }} size={36} />
            <Typography variant="body2" color="text.secondary">Generating interview question…</Typography>
          </Box>
        ) : question ? (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card sx={{ mb: 2.5, position: 'relative', overflow: 'hidden' }}>
              {/* Auto-advance progress bar at very top */}
              {autoAdvance && feedback && (
                <AutoAdvanceBar ms={AUTO_ADVANCE_MS} onDone={handleNext} />
              )}

              {/* Purple accent strip */}
              <Box sx={{ height: 3, background: 'linear-gradient(90deg, #a855f7, #7c3aed)', display: autoAdvance ? 'none' : 'block' }} />

              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                {/* Timer row */}
                {!feedback && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <CircularTimer key={timerKey} seconds={timerSeconds} total={TIMER_SECONDS} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <TimerIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                          Interview question · Q{answered + 1} of {TOTAL_QUESTIONS}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                        No hints · no lives · 30 seconds
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Question text */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                  <Box sx={{
                    width: 34, height: 34, borderRadius: '10px',
                    background: alpha('#a855f7', 0.14),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, mt: 0.2,
                  }}>
                    <WorkspacePremiumIcon sx={{ fontSize: 18, color: '#a855f7' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} lineHeight={1.65} sx={{ flex: 1 }}>
                    {question.question_text}
                  </Typography>
                </Box>

                {/* MCQ options */}
                {question.options && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                    {question.options.map((opt, i) => {
                      const isSel = selected === opt;
                      const isCorrect = feedback && opt === feedback.correct_answer;
                      const isWrong   = feedback && isSel && !feedback.is_correct;
                      const border = isCorrect ? '#10b981' : isWrong ? '#ef4444' : isSel ? '#a855f7'
                        : isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.12)';
                      const bg = isCorrect ? alpha('#10b981', 0.1) : isWrong ? alpha('#ef4444', 0.08)
                        : isSel ? alpha('#a855f7', 0.1) : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
                      return (
                        <motion.div
                          key={i}
                          animate={isWrong ? { x: [0, -7, 7, -5, 5, 0] } : {}}
                          transition={{ duration: 0.35 }}
                          whileHover={!feedback ? { scale: 1.006, x: 3 } : {}}
                          whileTap={!feedback ? { scale: 0.997 } : {}}
                        >
                          <Box
                            onClick={() => !feedback && setSelected(opt)}
                            sx={{
                              p: { xs: 1.5, md: 1.8 }, borderRadius: '12px',
                              cursor: feedback ? 'default' : 'pointer',
                              border: `1.5px solid ${border}`,
                              background: bg,
                              display: 'flex', alignItems: 'center', gap: 1.8,
                              transition: 'all 0.13s',
                            }}
                          >
                            <Box sx={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              border: `1.5px solid ${isCorrect ? '#10b981' : isWrong ? '#ef4444' : isSel ? '#a855f7' : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isCorrect ? alpha('#10b981', 0.18) : isWrong ? alpha('#ef4444', 0.18) : isSel ? alpha('#a855f7', 0.18) : 'transparent',
                            }}>
                              {isCorrect ? <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                                : isWrong ? <CancelIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                                : <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>{['A','B','C','D'][i]}</Typography>}
                            </Box>
                            <Typography fontWeight={isSel || isCorrect ? 600 : 400} sx={{ fontSize: '0.93rem' }}>{opt}</Typography>
                          </Box>
                        </motion.div>
                      );
                    })}
                  </Box>
                )}

                {/* Submit button */}
                {!feedback && (
                  <Box sx={{ mt: 2.5 }}>
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        variant="contained" fullWidth size="large"
                        onClick={() => handleSubmit(false)}
                        disabled={!selected}
                        sx={{
                          py: 1.7, borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
                          background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                          '&:hover': { filter: 'brightness(1.1)' },
                          '&:disabled': { opacity: 0.35 },
                        }}
                      >
                        Submit
                      </Button>
                    </motion.div>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Feedback panel */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.16,1,0.3,1] }}
                >
                  <Card sx={{
                    border: `1px solid ${feedback.is_correct ? alpha('#10b981', 0.4) : alpha('#ef4444', 0.4)}`,
                    background: feedback.is_correct ? alpha('#10b981', isDark ? 0.06 : 0.04) : alpha('#ef4444', isDark ? 0.06 : 0.04),
                    overflow: 'hidden',
                  }}>
                    {/* Auto-advance bar */}
                    <AutoAdvanceBar ms={AUTO_ADVANCE_MS} onDone={handleNext} />

                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: feedback.explanation ? 2 : 0 }}>
                        {feedback.is_correct
                          ? <CheckCircleIcon sx={{ color: '#10b981', fontSize: 22 }} />
                          : <CancelIcon sx={{ color: '#ef4444', fontSize: 22 }} />}
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={700} sx={{ fontSize: '1rem', lineHeight: 1.2 }}>
                            {feedback.is_correct ? 'Correct!' : 'Wrong'}
                          </Typography>
                          {!feedback.is_correct && (
                            <Typography variant="caption" color="text.secondary">
                              Correct: {feedback.correct_answer}
                            </Typography>
                          )}
                        </Box>
                        {feedback.xp_earned > 0 && (
                          <Chip
                            icon={<BoltIcon sx={{ fontSize: '0.85rem !important', color: '#fbbf24 !important' }} />}
                            label={`+${feedback.xp_earned} XP`} size="small"
                            sx={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontWeight: 700 }}
                          />
                        )}
                        <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                          Next in…
                        </Typography>
                      </Box>

                      {feedback.explanation && (
                        <Box sx={{
                          p: 2.5, borderRadius: '12px',
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                        }}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.9 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                            <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Why this is the answer
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.primary" lineHeight={1.8} sx={{ fontSize: '0.91rem' }}>
                            {feedback.explanation}
                          </Typography>
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
