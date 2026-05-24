import React from 'react';
import { Dialog, DialogContent, Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function LevelUpModal() {
  const theme = useTheme();
  const { levelUpModal, closeLevelUp } = useUIStore();
  const g = theme.palette.glass;

  return (
    <AnimatePresence>
      {levelUpModal.open && (
        <Dialog
          open={levelUpModal.open}
          onClose={closeLevelUp}
          PaperProps={{
            component: motion.div,
            initial: { opacity: 0, y: 12 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: 8 },
            transition: { duration: 0.2 },
            sx: {
              background: g.mid,
              backdropFilter: 'blur(18px) saturate(1.1)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.1)',
              border: `1px solid ${g.border}`,
              borderRadius: 2,
              minWidth: 320,
              textAlign: 'center',
              boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
            },
          }}
          BackdropProps={{ sx: { background: 'rgba(0,0,0,0.65)' } }}
        >
          <DialogContent sx={{ p: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(201,162,39,0.15)',
                border: '1px solid rgba(201,162,39,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 32, color: 'primary.light' }} />
            </Box>

            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
              Level up
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Literata", Georgia, serif',
                fontWeight: 600,
                fontSize: '1.75rem',
                mt: 0.5,
                mb: 1,
              }}
            >
              Level {levelUpModal.newLevel}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Nice work—keep the streak going when you are ready.
            </Typography>

            <Button variant="contained" fullWidth onClick={closeLevelUp} sx={{ py: 1.25 }}>
              Continue
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
