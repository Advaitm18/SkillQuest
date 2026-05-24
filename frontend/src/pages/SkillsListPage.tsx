import React, { useEffect, useState } from 'react';
import {
  Box, Container, Grid, Card, CardContent, Typography,
  Chip, LinearProgress, CircularProgress, Button, alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { skillService } from '../services/skillService';
import type { Skill } from '../types';
import { SkillTrackIcon } from '../utils/skillIcons';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export default function SkillsListPage() {
  const theme = useTheme();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    skillService.getSkills().then((data) => { setSkills(data); setLoading(false); });
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 0 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="h4" fontWeight={800} mb={0.5}>Skill Tracks</Typography>
        <Typography color="text.secondary" mb={4}>Choose a path and start your journey</Typography>
      </motion.div>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {skills.map((skill, i) => {
            const progress = skill.total_nodes > 0 ? (skill.completed_nodes / skill.total_nodes) * 100 : 0;
            const c = skill.color;
            return (
              <Grid item xs={12} md={6} key={skill.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <Card sx={{ p: 0.5, cursor: 'pointer' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 2.5, mb: 2.5 }}>
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '18px',
                            bgcolor: alpha(c, theme.palette.mode === 'dark' ? 0.14 : 0.1),
                            border: `1px solid ${alpha(c, 0.35)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <SkillTrackIcon name={skill.name} color={c} size={34} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="h6" fontWeight={700}>{skill.name}</Typography>
                            <Chip
                              label={skill.difficulty}
                              size="small"
                              sx={{
                                bgcolor: alpha(c, 0.12),
                                color: c,
                                border: `1px solid ${alpha(c, 0.3)}`,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                            {skill.description}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                          <Typography variant="caption" color="text.secondary">
                            {skill.completed_nodes}/{skill.total_nodes} nodes completed
                          </Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: skill.color }}>
                            {Math.round(progress)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            bgcolor: alpha(c, 0.12),
                            '& .MuiLinearProgress-bar': { backgroundColor: c },
                          }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AccountTreeIcon />}
                          onClick={() => navigate(`/skills/${skill.id}`)}
                          sx={{ flex: 1, borderRadius: '10px' }}
                        >
                          View Tree
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={() =>
                            navigate(
                              `/quiz/${encodeURIComponent(skill.name)}?domain=${encodeURIComponent(skill.name)}`
                            )
                          }
                          sx={{ flex: 1, borderRadius: '10px' }}
                        >
                          Quick Quiz
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
