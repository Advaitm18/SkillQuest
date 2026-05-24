import api from './api';
import type { Question, AnswerFeedback, Recommendation, ResumePoint } from '../types';

export const quizService = {
  /** `domain` is the parent skill track (e.g. Machine Learning) so the API scopes questions correctly. */
  async getQuestion(
    topic: string,
    difficulty: string = 'easy',
    domain?: string,
    mode: 'learn' | 'interview' = 'learn',
    excludeIds?: number[],
  ): Promise<Question> {
    const { data } = await api.get<Question>(`/quiz/${encodeURIComponent(topic)}`, {
      params: {
        difficulty,
        mode,
        ...(domain ? { domain } : {}),
        ...(excludeIds?.length ? { exclude_ids: excludeIds.join(',') } : {}),
      },
    });
    return data;
  },

  async submitAnswer(payload: {
    question_id: number;
    user_answer: string;
    time_taken_seconds: number;
    topic: string;
  }): Promise<AnswerFeedback> {
    const { data } = await api.post<AnswerFeedback>('/quiz/submit-answer', payload);
    return data;
  },

  async getRecommendations(): Promise<{ recommendations: Recommendation[] }> {
    const { data } = await api.get('/quiz/recommendations/next');
    return data;
  },

  async getResumePoints(): Promise<ResumePoint[]> {
    const { data } = await api.get<ResumePoint[]>('/quiz/resume');
    return data;
  },
};
