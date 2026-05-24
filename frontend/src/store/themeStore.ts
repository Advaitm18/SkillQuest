import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorMode = 'light' | 'dark';

interface ThemeState {
  mode: ColorMode;
  toggleMode: () => void;
  setMode: (m: ColorMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      toggleMode: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
      setMode: (m) => set({ mode: m }),
    }),
    { name: 'skillquest-theme' }
  )
);
