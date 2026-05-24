import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Chip, Button,
  CircularProgress, LinearProgress, alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { SkillTrackIcon } from '../utils/skillIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { skillService } from '../services/skillService';
import type { Skill, SkillNode } from '../types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StarIcon from '@mui/icons-material/Star';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FlashOnIcon from '@mui/icons-material/FlashOn';

interface NodeCardProps {
  node: SkillNode;
  skillColor: string;
  onStart: (node: SkillNode) => void;
  index: number;
}

function NodeCard({ node, skillColor, onStart, index }: NodeCardProps) {
  const isLeft = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: isLeft ? 'flex-start' : 'flex-end',
          pl: isLeft ? 0 : 8,
          pr: isLeft ? 8 : 0,
        }}
      >
        <Box
          sx={{
            width: '75%',
            p: 2.5,
            borderRadius: '20px',
            background: !node.is_unlocked
              ? 'rgba(255,255,255,0.02)'
              : node.is_completed
              ? `rgba(${node.is_boss_level ? '251,191,36' : '16,185,129'},0.08)`
              : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${
              !node.is_unlocked
                ? 'rgba(255,255,255,0.07)'
                : node.is_completed
                ? node.is_boss_level
                  ? 'rgba(251,191,36,0.5)'
                  : 'rgba(16,185,129,0.4)'
                : `${skillColor}50`
            }`,
            position: 'relative',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s',
            cursor: !node.is_unlocked ? 'not-allowed' : 'pointer',
            '&:hover': !!node.is_unlocked
              ? {
                  border: `1.5px solid ${node.is_boss_level ? '#fbbf24' : skillColor}`,
                  transform: 'scale(1.02)',
                  boxShadow: `0 8px 30px ${skillColor}20`,
                }
              : {},
          }}
          onClick={() => !!node.is_unlocked && onStart(node)}
        >
          {/* Boss level badge */}
          {node.is_boss_level && (
            <Chip
              icon={<StarIcon sx={{ fontSize: '0.9rem !important' }} />}
              label="BOSS"
              size="small"
              sx={{
                position: 'absolute',
                top: -12,
                right: 16,
                bgcolor: '#f59e0b',
                color: '#1a1510',
                fontWeight: 800,
                fontSize: '0.7rem',
                height: 24,
                boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
              }}
            />
          )}

          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                {/* Status icon */}
                <Box
                  sx={{
                    width: 40, height: 40, borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: !node.is_unlocked
                      ? 'rgba(255,255,255,0.04)'
                      : node.is_completed
                      ? 'rgba(16,185,129,0.2)'
                      : `${skillColor}20`,
                    fontSize: '1.2rem',
                    flexShrink: 0,
                  }}
                >
                  {!node.is_unlocked ? (
                    <LockIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.3)' }} />
                  ) : node.is_completed ? (
                    <CheckCircleIcon sx={{ fontSize: 20, color: '#10b981' }} />
                  ) : (
                    <PlayArrowIcon sx={{ fontSize: 20, color: skillColor }} />
                  )}
                </Box>
                <Box>
                  <Typography
                    fontWeight={700}
                    sx={{ color: !node.is_unlocked ? 'rgba(255,255,255,0.3)' : '#f1f5f9', fontSize: '1rem' }}
                  >
                    {node.name}
                  </Typography>
                </Box>
              </Box>
              <Typography
                variant="body2"
                sx={{ color: !node.is_unlocked ? 'rgba(255,255,255,0.2)' : 'text.secondary', lineHeight: 1.6 }}
              >
                {node.description}
              </Typography>
            </Box>

            {/* XP reward */}
            {!!node.is_unlocked && (
              <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                <BoltIcon sx={{ color: '#fbbf24', fontSize: 18 }} />
                <Typography variant="caption" display="block" fontWeight={700} sx={{ color: '#fbbf24' }}>
                  +{node.xp_reward}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}

// Vertical connector between nodes
function NodeConnector({ completed }: { completed: boolean }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        style={{ transformOrigin: 'top' }}
        transition={{ duration: 0.3 }}
      >
        <Box
          sx={{
            width: 3,
            height: 40,
            borderRadius: 99,
            bgcolor: completed ? theme.palette.success.main : 'action.hover',
          }}
        />
      </motion.div>
    </Box>
  );
}

export default function SkillTreePage() {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    skillService.getSkillTree(Number(id)).then((data) => {
      setSkill(data.skill);
      setNodes(data.nodes);
      setLoading(false);
    });
  }, [id]);

  const handleStartNode = (node: SkillNode) => {
    if (!skill) return;
    const q = new URLSearchParams({ domain: skill.name });
    navigate(`/quiz/${encodeURIComponent(node.name)}?${q.toString()}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!skill) return null;

  const progress = nodes.length > 0 ? (nodes.filter((n) => n.is_completed).length / nodes.length) * 100 : 0;

  return (
    <Container maxWidth="md" sx={{ py: 0 }}>
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 3, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          Back to Dashboard
        </Button>
      </motion.div>

      {/* Skill Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Box
          sx={{
            p: 3,
            borderRadius: '24px',
            mb: 6,
            bgcolor: alpha(skill.color, theme.palette.mode === 'dark' ? 0.12 : 0.08),
            border: `1px solid ${alpha(skill.color, 0.35)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(skill.color, 0.14),
                border: `1px solid ${alpha(skill.color, 0.3)}`,
              }}
            >
              <SkillTrackIcon name={skill.name} color={skill.color} size={40} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800}>{skill.name}</Typography>
              <Typography color="text.secondary">{skill.description}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`${skill.completed_nodes}/${skill.total_nodes} Nodes`}
              size="small"
              sx={{
                bgcolor: alpha(skill.color, 0.12),
                color: skill.color,
                border: `1px solid ${alpha(skill.color, 0.25)}`,
                fontWeight: 600,
              }}
            />
            <Chip
              label={skill.difficulty}
              size="small"
              sx={{ bgcolor: 'action.hover', fontWeight: 600 }}
            />
            {skill.user_xp_in_skill > 0 && (
              <Chip
                icon={<BoltIcon sx={{ fontSize: '0.9rem !important', color: 'primary.main !important' }} />}
                label={`${skill.user_xp_in_skill} XP earned`}
                size="small"
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main', fontWeight: 600 }}
              />
            )}
          </Box>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              bgcolor: alpha(skill.color, 0.12),
              '& .MuiLinearProgress-bar': { backgroundColor: skill.color },
            }}
          />
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
            {Math.round(progress)}% complete
          </Typography>
        </Box>
      </motion.div>

      {/* Skill Tree */}
      <Box>
        {nodes.map((node, i) => (
          <Box key={node.id}>
            <NodeCard
              node={node}
              skillColor={skill.color}
              onStart={handleStartNode}
              index={i}
            />
            {i < nodes.length - 1 && <NodeConnector completed={node.is_completed} />}
          </Box>
        ))}
      </Box>

      {/* Completion Banner + Rapid Fire unlock */}
      {nodes.every((n) => n.is_completed) && nodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Box
            sx={{
              mt: 4, p: 4, borderRadius: '24px', textAlign: 'center',
              bgcolor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={800} mb={1}>
              {skill.name} Complete!
            </Typography>
            <Typography color="text.secondary" mb={3}>
              You've finished every node. Ready to prove it in a real interview?
            </Typography>

            {/* Rapid Fire CTA */}
            <Box
              sx={{
                p: 3, borderRadius: '18px',
                background: alpha('#a855f7', theme.palette.mode === 'dark' ? 0.12 : 0.07),
                border: `1.5px solid ${alpha('#a855f7', 0.4)}`,
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                gap: 1.5, width: '100%', maxWidth: 400, mx: 'auto',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: '12px',
                  background: alpha('#a855f7', 0.18),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FlashOnIcon sx={{ fontSize: 20, color: '#a855f7' }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography fontWeight={800} sx={{ color: '#a855f7', lineHeight: 1.2, fontSize: '0.95rem' }}>
                    Rapid Fire unlocked
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    10 MAANG-grade questions · 30s each · no hints
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => navigate(`/rapid-fire/${encodeURIComponent(skill.name)}`)}
                sx={{
                  py: 1.5, borderRadius: '13px', fontWeight: 700, fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  '&:hover': { filter: 'brightness(1.1)' },
                }}
              >
                Start Rapid Fire — {skill.name}
              </Button>
            </Box>
          </Box>
        </motion.div>
      )}
    </Container>
  );
}
