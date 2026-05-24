import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useThemeStore } from '../store/themeStore';

export default function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
      <IconButton
        onClick={toggleMode}
        size="small"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{
          color: 'text.secondary',
          '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
        }}
      >
        {isDark ? <Brightness7Icon sx={{ fontSize: 22 }} /> : <Brightness4Icon sx={{ fontSize: 22 }} />}
      </IconButton>
    </Tooltip>
  );
}
