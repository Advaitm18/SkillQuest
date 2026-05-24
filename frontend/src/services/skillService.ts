import api from './api';
import type { Skill, SkillNode } from '../types';

export interface SkillTreeData {
  skill: Skill;
  nodes: SkillNode[];
}

export const skillService = {
  async getSkills(): Promise<Skill[]> {
    const { data } = await api.get<Skill[]>('/skills');
    return data;
  },

  async getSkillTree(skillId: number): Promise<SkillTreeData> {
    const { data } = await api.get<SkillTreeData>(`/skills/${skillId}/tree`);
    return data;
  },
};
