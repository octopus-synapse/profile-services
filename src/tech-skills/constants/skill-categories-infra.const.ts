/**
 * Stack Overflow Skill Categories - Databases & DevOps
 *
 * Maps database and DevOps-related tags to skill types and niches.
 */

import type { SkillType } from '../interfaces';

type SkillCategory = { type: SkillType; niche: string | null };

export const DATABASE_CATEGORIES: Record<string, SkillCategory> = {
  mysql: { type: 'DATABASE', niche: 'backend' },
  postgresql: { type: 'DATABASE', niche: 'backend' },
  postgres: { type: 'DATABASE', niche: 'backend' },
  mongodb: { type: 'DATABASE', niche: 'backend' },
  redis: { type: 'DATABASE', niche: 'backend' },
  sqlite: { type: 'DATABASE', niche: 'backend' },
  oracle: { type: 'DATABASE', niche: 'backend' },
  'sql-server': { type: 'DATABASE', niche: 'backend' },
  mariadb: { type: 'DATABASE', niche: 'backend' },
  cassandra: { type: 'DATABASE', niche: 'backend' },
  dynamodb: { type: 'DATABASE', niche: 'backend' },
  elasticsearch: { type: 'DATABASE', niche: 'backend' },
  neo4j: { type: 'DATABASE', niche: 'backend' },
  firebase: { type: 'DATABASE', niche: 'backend' },
  supabase: { type: 'DATABASE', niche: 'backend' },
  prisma: { type: 'LIBRARY', niche: 'backend' },
  typeorm: { type: 'LIBRARY', niche: 'backend' },
  sequelize: { type: 'LIBRARY', niche: 'backend' },
  mongoose: { type: 'LIBRARY', niche: 'backend' },
};

export const DEVOPS_CATEGORIES: Record<string, SkillCategory> = {
  docker: { type: 'TOOL', niche: 'devops' },
  kubernetes: { type: 'PLATFORM', niche: 'devops' },
  k8s: { type: 'PLATFORM', niche: 'devops' },
  aws: { type: 'PLATFORM', niche: 'devops' },
  azure: { type: 'PLATFORM', niche: 'devops' },
  'google-cloud-platform': { type: 'PLATFORM', niche: 'devops' },
  gcp: { type: 'PLATFORM', niche: 'devops' },
  terraform: { type: 'TOOL', niche: 'devops' },
  ansible: { type: 'TOOL', niche: 'devops' },
  jenkins: { type: 'TOOL', niche: 'devops' },
  'github-actions': { type: 'TOOL', niche: 'devops' },
  'gitlab-ci': { type: 'TOOL', niche: 'devops' },
  circleci: { type: 'TOOL', niche: 'devops' },
  nginx: { type: 'TOOL', niche: 'devops' },
  apache: { type: 'TOOL', niche: 'devops' },
  linux: { type: 'PLATFORM', niche: 'devops' },
  bash: { type: 'TOOL', niche: 'devops' },
  prometheus: { type: 'TOOL', niche: 'devops' },
  grafana: { type: 'TOOL', niche: 'devops' },
  datadog: { type: 'TOOL', niche: 'devops' },
  heroku: { type: 'PLATFORM', niche: 'devops' },
  vercel: { type: 'PLATFORM', niche: 'devops' },
  netlify: { type: 'PLATFORM', niche: 'devops' },
  digitalocean: { type: 'PLATFORM', niche: 'devops' },
};
