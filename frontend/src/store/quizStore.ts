import { create } from 'zustand';
import type { Question, AnswerFeedback, DifficultyLevel } from '../types';

export const SESSION_LENGTH = 15;   // questions per session
export const MAX_LIVES = 5;         // hearts at session start

export type SessionEndReason = 'completed' | 'lives_out';

export interface AnswerRecord {
  correct: boolean;
  difficulty: DifficultyLevel;
  xp: number;
}

interface QuizState {
  currentQuestion: Question | null;
  feedback: AnswerFeedback | null;
  currentTopic: string;
  currentDifficulty: DifficultyLevel;
  questionsAnswered: number;
  correctAnswers: number;
  sessionXP: number;
  isLoading: boolean;
  showFeedback: boolean;

  // Session mechanics
  lives: number;
  combo: number;
  maxCombo: number;
  sessionComplete: boolean;
  sessionEndReason: SessionEndReason | null;
  highestDifficulty: DifficultyLevel;
  sessionHistory: AnswerRecord[];

  setQuestion: (q: Question) => void;
  setFeedback: (f: AnswerFeedback) => void;
  setLoading: (v: boolean) => void;
  setTopic: (t: string) => void;
  setDifficulty: (d: DifficultyLevel) => void;
  nextQuestion: () => void;
  resetSession: () => void;
}

const DIFF_ORDER: DifficultyLevel[] = ['easy', 'intermediate', 'pro', 'mastery'];

export const useQuizStore = create<QuizState>((set) => ({
  currentQuestion: null,
  feedback: null,
  currentTopic: 'Machine Learning',
  currentDifficulty: 'easy',
  questionsAnswered: 0,
  correctAnswers: 0,
  sessionXP: 0,
  isLoading: false,
  showFeedback: false,

  lives: MAX_LIVES,
  combo: 0,
  maxCombo: 0,
  sessionComplete: false,
  sessionEndReason: null,
  highestDifficulty: 'easy',
  sessionHistory: [],

  setQuestion: (question) =>
    set({ currentQuestion: question, feedback: null, showFeedback: false }),

  setFeedback: (feedback) =>
    set((state) => {
      const newAnswered   = state.questionsAnswered + 1;
      const newCorrect    = state.correctAnswers + (feedback.is_correct ? 1 : 0);
      const newSessionXP  = state.sessionXP + feedback.xp_earned;
      const newCombo      = feedback.is_correct ? state.combo + 1 : 0;
      const newMaxCombo   = Math.max(state.maxCombo, newCombo);
      const newLives      = feedback.is_correct ? state.lives : Math.max(0, state.lives - 1);
      const nextDiff      = (feedback.next_difficulty as DifficultyLevel) ?? state.currentDifficulty;
      const newHighest    = DIFF_ORDER.indexOf(nextDiff) > DIFF_ORDER.indexOf(state.highestDifficulty)
                              ? nextDiff : state.highestDifficulty;

      const record: AnswerRecord = {
        correct: feedback.is_correct,
        difficulty: state.currentDifficulty,
        xp: feedback.xp_earned,
      };

      const sessionComplete = newAnswered >= SESSION_LENGTH || newLives <= 0;
      const sessionEndReason: SessionEndReason | null = sessionComplete
        ? (newLives <= 0 && newAnswered < SESSION_LENGTH ? 'lives_out' : 'completed')
        : null;

      return {
        feedback,
        showFeedback: true,
        questionsAnswered: newAnswered,
        correctAnswers: newCorrect,
        sessionXP: newSessionXP,
        currentDifficulty: nextDiff,
        combo: newCombo,
        maxCombo: newMaxCombo,
        lives: newLives,
        highestDifficulty: newHighest,
        sessionHistory: [...state.sessionHistory, record],
        sessionComplete,
        sessionEndReason,
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setTopic: (topic) =>
    set({
      currentTopic: topic,
      questionsAnswered: 0, correctAnswers: 0, sessionXP: 0,
      currentDifficulty: 'easy',
      lives: MAX_LIVES, combo: 0, maxCombo: 0,
      sessionComplete: false, sessionEndReason: null,
      highestDifficulty: 'easy', sessionHistory: [],
    }),

  setDifficulty: (difficulty) => set({ currentDifficulty: difficulty }),

  nextQuestion: () =>
    set({ feedback: null, showFeedback: false, currentQuestion: null }),

  resetSession: () =>
    set({
      currentQuestion: null, feedback: null,
      questionsAnswered: 0, correctAnswers: 0, sessionXP: 0,
      isLoading: false, showFeedback: false,
      lives: MAX_LIVES, combo: 0, maxCombo: 0,
      currentDifficulty: 'easy',
      sessionComplete: false, sessionEndReason: null,
      highestDifficulty: 'easy', sessionHistory: [],
    }),
}));
