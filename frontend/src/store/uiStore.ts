import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UIState {
  notifications: Notification[];
  levelUpModal: { open: boolean; newLevel: number };
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  showLevelUp: (level: number) => void;
  closeLevelUp: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  notifications: [],
  levelUpModal: { open: false, newLevel: 1 },

  addNotification: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4000);
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  showLevelUp: (newLevel) =>
    set({ levelUpModal: { open: true, newLevel } }),

  closeLevelUp: () =>
    set({ levelUpModal: { open: false, newLevel: 1 } }),
}));
