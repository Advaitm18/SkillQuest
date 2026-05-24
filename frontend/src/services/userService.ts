import api from './api';
import type { User, Achievement, AnalyticsData } from '../types';

export const userService = {
  async getProfile(): Promise<User> {
    const { data } = await api.get<User>('/users/profile');
    return data;
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const { data } = await api.get<AnalyticsData>('/users/analytics');
    return data;
  },

  async getAchievements(): Promise<Achievement[]> {
    const { data } = await api.get<Achievement[]>('/users/achievements');
    return data;
  },

  async getLeaderboard(limit = 20) {
    const { data } = await api.get('/gamification/leaderboard', { params: { limit } });
    return data;
  },
};
