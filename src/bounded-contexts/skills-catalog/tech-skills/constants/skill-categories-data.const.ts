/**
 * Stack Overflow Skill Categories - Data, AI & Testing
 *
 * Maps data science, AI/ML, and testing tags to skill types and niches.
 */

import type { SkillType } from '../interfaces';

type SkillCategory = { type: SkillType; niche: string | null };

export const DATA_AI_CATEGORIES: Record<string, SkillCategory> = {
  pandas: { type: 'LIBRARY', niche: 'data-science' },
  numpy: { type: 'LIBRARY', niche: 'data-science' },
  'scikit-learn': { type: 'LIBRARY', niche: 'data-science' },
  tensorflow: { type: 'FRAMEWORK', niche: 'machine-learning' },
  pytorch: { type: 'FRAMEWORK', niche: 'machine-learning' },
  keras: { type: 'LIBRARY', niche: 'machine-learning' },
  opencv: { type: 'LIBRARY', niche: 'machine-learning' },
  spark: { type: 'PLATFORM', niche: 'data-engineering' },
  hadoop: { type: 'PLATFORM', niche: 'data-engineering' },
  airflow: { type: 'TOOL', niche: 'data-engineering' },
  kafka: { type: 'PLATFORM', niche: 'data-engineering' },
  dbt: { type: 'TOOL', niche: 'data-engineering' },
  snowflake: { type: 'PLATFORM', niche: 'data-engineering' },
  'power-bi': { type: 'TOOL', niche: 'data-analytics' },
  tableau: { type: 'TOOL', niche: 'data-analytics' },
  looker: { type: 'TOOL', niche: 'data-analytics' },
  metabase: { type: 'TOOL', niche: 'data-analytics' },
  jupyter: { type: 'TOOL', niche: 'data-science' },
  langchain: { type: 'FRAMEWORK', niche: 'machine-learning' },
  huggingface: { type: 'PLATFORM', niche: 'machine-learning' },
  openai: { type: 'PLATFORM', niche: 'machine-learning' },
};

export const TESTING_CATEGORIES: Record<string, SkillCategory> = {
  jest: { type: 'TOOL', niche: 'qa' },
  mocha: { type: 'TOOL', niche: 'qa' },
  cypress: { type: 'TOOL', niche: 'qa' },
  playwright: { type: 'TOOL', niche: 'qa' },
  selenium: { type: 'TOOL', niche: 'qa' },
  puppeteer: { type: 'TOOL', niche: 'qa' },
  pytest: { type: 'TOOL', niche: 'qa' },
  junit: { type: 'TOOL', niche: 'qa' },
  testng: { type: 'TOOL', niche: 'qa' },
  postman: { type: 'TOOL', niche: 'qa' },
  insomnia: { type: 'TOOL', niche: 'qa' },
  sentry: { type: 'TOOL', niche: 'qa' },
  'new-relic': { type: 'TOOL', niche: 'qa' },
  vitest: { type: 'TOOL', niche: 'qa' },
  'testing-library': { type: 'LIBRARY', niche: 'qa' },
};
