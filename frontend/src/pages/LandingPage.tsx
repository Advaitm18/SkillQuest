import React, { useRef } from 'react';
import {
  Box, Container, Typography, Button, Grid, Chip,
  Card, CardContent, Divider, alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
} from 'framer-motion';
import SchoolIcon from '@mui/icons-material/School';
import TuneIcon from '@mui/icons-material/Tune';
import FlagIcon from '@mui/icons-material/Flag';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { SkillTrackIcon } from '../utils/skillIcons';

const NAVBAR_H = 58;

/* ─── Animation variants ─────────────────────────────────────────────── */
const revealUp = {
  hidden: { opacity: 0, y: 36, filter: 'blur(6px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const staggerContainer = (stagger = 0.1) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});

const slideLeft = {
  hidden: { opacity: 0, x: -40, filter: 'blur(4px)' },
  show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const slideRight = {
  hidden: { opacity: 0, x: 40, filter: 'blur(4px)' },
  show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

/* ─── Section wrapper ────────────────────────────────────────────────── */
function Section({
  id, children, divider = true,
}: { id: string; children: React.ReactNode; divider?: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <>
      <Box
        id={id}
        ref={ref}
        component="section"
        sx={{
          minHeight: `calc(100vh - ${NAVBAR_H}px)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: { xs: 7, md: 10 },
          scrollMarginTop: `${NAVBAR_H}px`,
          position: 'relative',
        }}
      >
        {/* Faint per-section ambient glow */}
        <Box
          sx={{
            position: 'absolute',
            top: '15%',
            right: '-10%',
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,162,39,0.045) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <motion.div
          variants={staggerContainer(0.12)}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
        >
          {children}
        </motion.div>
      </Box>
      {divider && <Divider sx={{ borderColor: 'divider' }} />}
    </>
  );
}

/* ─── Animated section label ────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={revealUp}>
      <Typography
        variant="overline"
        sx={{
          letterSpacing: '0.14em',
          color: 'primary.main',
          display: 'block',
          mb: 1.5,
          fontWeight: 600,
          fontSize: '0.7rem',
        }}
      >
        {children}
      </Typography>
    </motion.div>
  );
}

/* ─── Data ───────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: SchoolIcon,
    title: 'Questions by track',
    body: 'Practice stays inside the skill you picked—cloud, data, security, or TypeScript—so you are not drilling random trivia.',
  },
  {
    icon: TuneIcon,
    title: 'Difficulty that adapts',
    body: 'Your recent accuracy and pace nudge the next question up or down so sessions stay challenging, not chaotic.',
  },
  {
    icon: FlagIcon,
    title: 'Progress you can see',
    body: 'XP and levels mark momentum—not a substitute for understanding the material.',
  },
];

const TRACKS: { name: string; blurb: string; nodes: number; color: string }[] = [
  { name: 'Machine Learning', blurb: 'Models, training, evaluation', nodes: 6, color: '#8b6914' },
  { name: 'Web Development', blurb: 'HTML, JS, APIs, stacks', nodes: 6, color: '#2d6a4f' },
  { name: 'DSA', blurb: 'Structures, complexity, patterns', nodes: 6, color: '#b45309' },
  { name: 'Python', blurb: 'Language core and idioms', nodes: 4, color: '#5a7d6e' },
  { name: 'Cloud & DevOps', blurb: 'AWS, containers, CI/CD, IaC', nodes: 5, color: '#33658a' },
  { name: 'Data Engineering', blurb: 'SQL, pipelines, warehousing', nodes: 5, color: '#7c6f64' },
  { name: 'AI & LLMs', blurb: 'Prompting, RAG, safety, eval', nodes: 5, color: '#6b5344' },
  { name: 'Cybersecurity', blurb: 'Auth, OWASP, crypto basics', nodes: 5, color: '#8c4a4a' },
  { name: 'System Design', blurb: 'Scale, APIs, reliability', nodes: 5, color: '#5c6b7a' },
  { name: 'TypeScript', blurb: 'Types, tooling, app patterns', nodes: 5, color: '#3d5a80' },
];

const STEPS = [
  { n: '01', title: 'Pick a track', text: 'Choose the domain that matches what you are studying or interviewing for.' },
  { n: '02', title: 'Answer in short sets', text: 'Sessions are built for focus—one question at a time with immediate feedback.' },
  { n: '03', title: 'Adjust as you go', text: 'Difficulty responds to how you are doing, so the next rep matches your level.' },
];

const STATS = [
  { value: '10', label: 'skill tracks' },
  { value: '500+', label: 'seed questions' },
  { value: 'AI', label: 'generated on demand' },
];

/* ─── Hero headline — word-by-word reveal ─────────────────────────── */
const HEADLINE = ['Short', 'sessions.', 'Clear', 'topics.', 'No', 'filler.'];

function HeroHeadline() {
  return (
    <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: '0.3em', md: '0.35em' } }}>
      {HEADLINE.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.55, delay: 0.15 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'inline-block' }}
        >
          <Box
            component="span"
            sx={{
              color: i === 2 || i === 3 ? 'primary.main' : 'text.primary',
            }}
          >
            {word}
          </Box>
        </motion.span>
      ))}
    </Box>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const scrollNext = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ overflowX: 'hidden' }}>

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <Box
        ref={heroRef}
        id="hero"
        sx={{
          height: `calc(100vh - ${NAVBAR_H}px)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient background blobs — animate slowly */}
        <Box
          component={motion.div}
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          sx={{
            position: 'absolute',
            top: '-15%',
            left: '-5%',
            width: { xs: 420, md: 680 },
            height: { xs: 420, md: 680 },
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(201,162,39,0.09) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(184,134,11,0.08) 0%, transparent 65%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <Box
          component={motion.div}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          sx={{
            position: 'absolute',
            bottom: '-10%',
            right: '-8%',
            width: { xs: 300, md: 520 },
            height: { xs: 300, md: 520 },
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(107,144,128,0.08) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(90,125,110,0.07) 0%, transparent 65%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Content with parallax on scroll */}
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div style={{ y: heroY, opacity: heroOpacity }}>
            {/* Overline */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: '0.14em',
                  color: 'primary.main',
                  display: 'block',
                  mb: 2.5,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              >
                Practice product
              </Typography>
            </motion.div>

            {/* Headline */}
            <Typography
              sx={{
                fontFamily: '"Literata", Georgia, serif',
                fontWeight: 600,
                fontSize: { xs: '2.5rem', sm: '3.4rem', md: '4.2rem' },
                lineHeight: 1.08,
                mb: 3.5,
                maxWidth: 720,
              }}
            >
              <HeroHeadline />
            </Typography>

            {/* Body */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.8 }}
            >
              <Typography
                color="text.secondary"
                sx={{ mb: 5, maxWidth: 500, lineHeight: 1.8, fontSize: '1.0625rem' }}
              >
                Structured reps in the technical subjects that matter—adaptive difficulty, a record of your
                progress, and questions that actually stay on topic.
              </Typography>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 6 }}>
                <Button variant="contained" size="large" onClick={() => navigate('/signup')}>
                  Create account
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
              </Box>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.25 }}
            >
              <Box sx={{ display: 'flex', gap: { xs: 3, sm: 5 }, flexWrap: 'wrap' }}>
                {STATS.map((s, i) => (
                  <Box key={i}>
                    <Typography
                      sx={{
                        fontFamily: '"Literata", Georgia, serif',
                        fontWeight: 600,
                        fontSize: { xs: '1.5rem', md: '1.75rem' },
                        color: 'text.primary',
                        lineHeight: 1.1,
                      }}
                    >
                      {s.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.02em' }}>
                      {s.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </motion.div>
          </motion.div>
        </Container>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}
        >
          <Box
            onClick={scrollNext}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
              transition: 'color 0.2s',
            }}
          >
            <Typography variant="caption" sx={{ letterSpacing: '0.1em', fontSize: '0.65rem', textTransform: 'uppercase' }}>
              Scroll
            </Typography>
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            </motion.div>
          </Box>
        </motion.div>
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* ═══════════════════════════ ABOUT ══════════════════════════ */}
      <Section id="about">
        <Container maxWidth="md">
          <SectionLabel>About</SectionLabel>
          <motion.div variants={revealUp}>
            <Typography
              sx={{
                fontFamily: '"Literata", Georgia, serif',
                fontWeight: 600,
                fontSize: { xs: '1.9rem', md: '2.5rem' },
                mb: 2,
                maxWidth: 560,
                lineHeight: 1.2,
              }}
            >
              Deliberate practice for technical interviews.
            </Typography>
          </motion.div>

          <motion.div variants={revealUp}>
            <Typography color="text.secondary" sx={{ mb: 6, maxWidth: 600, lineHeight: 1.85, fontSize: '1.0625rem' }}>
              You choose a track—machine learning, cloud, TypeScript, security, and more—and practice with
              questions scoped to that domain. Built for steady progress: small wins, clear explanations, and
              difficulty that shifts with your performance so you are neither bored nor overwhelmed.
            </Typography>
          </motion.div>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <motion.div variants={slideLeft}>
                <Card
                  component={motion.div}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  sx={{ height: '100%', cursor: 'default' }}
                >
                  <CardContent sx={{ p: 3.5 }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2.5,
                        bgcolor: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.09),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2.5,
                      }}
                    >
                      <GroupsOutlinedIcon sx={{ fontSize: 26, color: 'primary.main' }} />
                    </Box>
                    <Typography fontWeight={600} mb={1.5} fontSize="1.05rem">Who it is for</Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
                      Developers and students who want deliberate practice—not passive video watching—and a simple
                      way to see streaks and accuracy over time.
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={6}>
              <motion.div variants={slideRight}>
                <Card
                  component={motion.div}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  sx={{ height: '100%', cursor: 'default' }}
                >
                  <CardContent sx={{ p: 3.5 }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2.5,
                        bgcolor: alpha(theme.palette.secondary.main, isDark ? 0.14 : 0.09),
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2.5,
                      }}
                    >
                      <AutoStoriesOutlinedIcon sx={{ fontSize: 26, color: 'secondary.main' }} />
                    </Box>
                    <Typography fontWeight={600} mb={1.5} fontSize="1.05rem">What is not the goal</Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
                      Replacing courses or documentation. Use SkillQuest alongside real projects and
                      reading—these sessions are for reinforcement and interview-style recall.
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Section>

      {/* ═══════════════════════ FEATURES ═══════════════════════════ */}
      <Section id="features">
        <Container maxWidth="md">
          <SectionLabel>Features</SectionLabel>
          <motion.div variants={revealUp}>
            <Typography
              sx={{
                fontFamily: '"Literata", Georgia, serif',
                fontWeight: 600,
                fontSize: { xs: '1.9rem', md: '2.5rem' },
                mb: 2,
                maxWidth: 480,
                lineHeight: 1.2,
              }}
            >
              Everything you need, nothing you don't.
            </Typography>
          </motion.div>
          <motion.div variants={revealUp}>
            <Typography color="text.secondary" sx={{ mb: 6, maxWidth: 440, fontSize: '1.0625rem' }}>
              What you get in the app today.
            </Typography>
          </motion.div>

          <motion.div variants={staggerContainer(0.13)}>
            <Grid container spacing={{ xs: 2.5, md: 3 }}>
              {FEATURES.map((f, idx) => {
                const Icon = f.icon;
                return (
                  <Grid item xs={12} md={4} key={f.title}>
                    <motion.div variants={scaleIn}>
                      <Card
                        component={motion.div}
                        whileHover={{ y: -8, boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.35)' : '0 12px 32px rgba(0,0,0,0.1)', transition: { duration: 0.25 } }}
                        sx={{ height: '100%', cursor: 'default' }}
                      >
                        <CardContent sx={{ p: 3.5 }}>
                          <Box
                            component={motion.div}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: 2.5,
                              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.14 : 0.09),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 2.5,
                              color: 'primary.main',
                            }}
                          >
                            <Icon sx={{ fontSize: 24 }} />
                          </Box>
                          <Typography fontWeight={600} mb={1.5} fontSize="1.05rem">{f.title}</Typography>
                          <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
                            {f.body}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        </Container>
      </Section>

      {/* ════════════════════════ TRACKS ════════════════════════════ */}
      <Section id="tracks">
        <Container maxWidth="md">
          <SectionLabel>Tracks</SectionLabel>
          <motion.div variants={revealUp}>
            <Typography
              sx={{
                fontFamily: '"Literata", Georgia, serif',
                fontWeight: 600,
                fontSize: { xs: '1.9rem', md: '2.5rem' },
                mb: 2,
                maxWidth: 480,
                lineHeight: 1.2,
              }}
            >
              Ten domains. One place.
            </Typography>
          </motion.div>
          <motion.div variants={revealUp}>
            <Typography color="text.secondary" sx={{ mb: 6, maxWidth: 480, fontSize: '1.0625rem' }}>
              Pick a track when you practice; questions are scoped to that domain.
            </Typography>
          </motion.div>

          <motion.div variants={staggerContainer(0.05)}>
            <Grid container spacing={2}>
              {TRACKS.map((t) => (
                <Grid item xs={12} sm={6} key={t.name}>
                  <motion.div variants={revealUp}>
                    <Card
                      component={motion.div}
                      whileHover={{ x: 6, transition: { duration: 0.2, ease: 'easeOut' } }}
                      sx={{ cursor: 'default', overflow: 'hidden', position: 'relative' }}
                    >
                      {/* Colour accent strip on left edge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          bgcolor: t.color,
                          opacity: 0.7,
                        }}
                      />
                      <CardContent sx={{ py: 2, px: 2.5, pl: 3.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: alpha(t.color, isDark ? 0.15 : 0.1),
                              border: `1px solid ${alpha(t.color, 0.28)}`,
                            }}
                          >
                            <SkillTrackIcon name={t.name} color={t.color} size={22} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={600} noWrap fontSize="0.9375rem">{t.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                              {t.blurb}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${t.nodes} units`}
                            size="small"
                            variant="outlined"
                            sx={{ flexShrink: 0, fontSize: '0.7rem', borderColor: alpha(t.color, 0.35), color: t.color }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Section>

      {/* ══════════════════════ HOW IT WORKS ════════════════════════ */}
      <Section id="how-it-works" divider={false}>
        <Container maxWidth="md">
          <SectionLabel>How it works</SectionLabel>
          <motion.div variants={revealUp}>
            <Typography
              sx={{
                fontFamily: '"Literata", Georgia, serif',
                fontWeight: 600,
                fontSize: { xs: '1.9rem', md: '2.5rem' },
                mb: 2,
                maxWidth: 480,
                lineHeight: 1.2,
              }}
            >
              Three steps to a useful habit.
            </Typography>
          </motion.div>
          <motion.div variants={revealUp}>
            <Typography color="text.secondary" sx={{ mb: 6, maxWidth: 480, fontSize: '1.0625rem' }}>
              From signup to a daily practice in minutes.
            </Typography>
          </motion.div>

          <motion.div variants={staggerContainer(0.15)}>
            <Grid container spacing={3}>
              {STEPS.map((s, idx) => (
                <Grid item xs={12} md={4} key={s.n}>
                  <motion.div variants={revealUp}>
                    <Card
                      component={motion.div}
                      whileHover={{ y: -6, transition: { duration: 0.22 } }}
                      sx={{ height: '100%', cursor: 'default', position: 'relative', overflow: 'hidden' }}
                    >
                      {/* Large ghost number */}
                      <Typography
                        sx={{
                          position: 'absolute',
                          top: -10,
                          right: 16,
                          fontFamily: '"Literata", Georgia, serif',
                          fontWeight: 700,
                          fontSize: '5.5rem',
                          lineHeight: 1,
                          color: alpha(theme.palette.primary.main, isDark ? 0.07 : 0.06),
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                      >
                        {s.n}
                      </Typography>
                      <CardContent sx={{ p: 3.5 }}>
                        <Typography
                          variant="overline"
                          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.68rem' }}
                        >
                          Step {s.n}
                        </Typography>
                        <Typography fontWeight={600} mb={1.5} mt={0.75} fontSize="1.05rem">
                          {s.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
                          {s.text}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          <motion.div variants={revealUp}>
            <Box sx={{ mt: 7 }}>
              <Button variant="contained" size="large" onClick={() => navigate('/signup')}>
                Get started — it's free
              </Button>
            </Box>
          </motion.div>
        </Container>
      </Section>

      {/* ════════════════════════ FOOTER ════════════════════════════ */}
      <Box
        component="footer"
        sx={{ py: { xs: 4, md: 5 }, px: 2, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} SkillQuest
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button size="small" color="inherit" onClick={() => navigate('/login')}>Sign in</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/signup')}>Create account</Button>
            </Box>
          </Box>
        </Container>
      </Box>

    </Box>
  );
}
