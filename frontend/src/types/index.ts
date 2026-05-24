export interface User {
  id: number;
  username: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  longest_streak: number;
  total_questions_answered: number;
  total_correct_answers: number;
  accuracy: number;
  avatar?: string;
  created_at: string;
}

export interface Skill {
  id: number;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  difficulty: string;
  total_nodes: number;
  completed_nodes: number;
  user_xp_in_skill: number;
}

export interface SkillNode {
  id: number;
  skill_id: number;
  parent_id: number | null;
  name: string;
  description: string;
  order_index: number;
  required_xp: number;
  xp_reward: number;
  is_boss_level: boolean;
  is_unlocked: boolean;
  is_completed: boolean;
}

export type DifficultyLevel = 'easy' | 'intermediate' | 'pro' | 'mastery';

export interface Question {
  id: number;
  topic: string;
  question_text: string;
  question_type: 'mcq' | 'text';
  options?: string[];
  difficulty: DifficultyLevel;
  hint?: string;
}

export interface AnswerFeedback {
  is_correct: boolean;
  score: number;
  correct_answer: string;
  explanation?: string;
  xp_earned: number;
  new_total_xp: number;
  new_level: number;
  leveled_up: boolean;
  next_difficulty: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_bonus: number;
  is_rare: boolean;
  earned_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  xp: number;
  level: number;
  streak: number;
  avatar?: string;
}

export interface Recommendation {
  topic: string;
  score: number;
  reason: string;
  category: string;
}

export interface ResumePoint {
  domain: string;
  topic: string;
  last_attempted_at: string;
}

export interface AnalyticsData {
  total_xp: number;
  current_level: number;
  streak: number;
  accuracy: number;
  total_questions: number;
  topics_studied: string[];
  weak_topics: string[];
  strong_topics: string[];
  xp_history: { day: string; xp: number }[];
  accuracy_by_topic: Record<string, number>;
  recent_attempts: {
    topic: string;
    is_correct: boolean;
    difficulty: string;
    xp_earned: number;
    created_at: string;
  }[];
}
