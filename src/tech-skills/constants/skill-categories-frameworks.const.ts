/**
 * Stack Overflow Skill Categories
 *
 * Maps Stack Overflow tags to skill types and niches.
 * Used for categorizing skills fetched from the API.
 */

import type { SkillType } from '../interfaces';

type SkillCategory = { type: SkillType; niche: string | null };

export const SKILL_CATEGORIES: Record<string, SkillCategory> = {
  // Frameworks - Frontend
  react: { type: 'FRAMEWORK', niche: 'frontend' },
  reactjs: { type: 'FRAMEWORK', niche: 'frontend' },
  angular: { type: 'FRAMEWORK', niche: 'frontend' },
  angularjs: { type: 'FRAMEWORK', niche: 'frontend' },
  'vue.js': { type: 'FRAMEWORK', niche: 'frontend' },
  vuejs: { type: 'FRAMEWORK', niche: 'frontend' },
  svelte: { type: 'FRAMEWORK', niche: 'frontend' },
  'next.js': { type: 'FRAMEWORK', niche: 'frontend' },
  nextjs: { type: 'FRAMEWORK', niche: 'frontend' },
  'nuxt.js': { type: 'FRAMEWORK', niche: 'frontend' },
  gatsby: { type: 'FRAMEWORK', niche: 'frontend' },
  'ember.js': { type: 'FRAMEWORK', niche: 'frontend' },
  'backbone.js': { type: 'FRAMEWORK', niche: 'frontend' },

  // Frameworks - Backend
  'node.js': { type: 'FRAMEWORK', niche: 'backend' },
  nodejs: { type: 'FRAMEWORK', niche: 'backend' },
  express: { type: 'FRAMEWORK', niche: 'backend' },
  expressjs: { type: 'FRAMEWORK', niche: 'backend' },
  nestjs: { type: 'FRAMEWORK', niche: 'backend' },
  fastify: { type: 'FRAMEWORK', niche: 'backend' },
  koa: { type: 'FRAMEWORK', niche: 'backend' },
  django: { type: 'FRAMEWORK', niche: 'backend' },
  flask: { type: 'FRAMEWORK', niche: 'backend' },
  fastapi: { type: 'FRAMEWORK', niche: 'backend' },
  spring: { type: 'FRAMEWORK', niche: 'backend' },
  'spring-boot': { type: 'FRAMEWORK', niche: 'backend' },
  rails: { type: 'FRAMEWORK', niche: 'backend' },
  'ruby-on-rails': { type: 'FRAMEWORK', niche: 'backend' },
  laravel: { type: 'FRAMEWORK', niche: 'backend' },
  symfony: { type: 'FRAMEWORK', niche: 'backend' },
  'asp.net': { type: 'FRAMEWORK', niche: 'backend' },
  'asp.net-core': { type: 'FRAMEWORK', niche: 'backend' },
  'asp.net-mvc': { type: 'FRAMEWORK', niche: 'backend' },
  gin: { type: 'FRAMEWORK', niche: 'backend' },
  fiber: { type: 'FRAMEWORK', niche: 'backend' },
  actix: { type: 'FRAMEWORK', niche: 'backend' },
  rocket: { type: 'FRAMEWORK', niche: 'backend' },
  phoenix: { type: 'FRAMEWORK', niche: 'backend' },

  // Frameworks - Mobile
  'react-native': { type: 'FRAMEWORK', niche: 'mobile' },
  flutter: { type: 'FRAMEWORK', niche: 'mobile' },
  ionic: { type: 'FRAMEWORK', niche: 'mobile' },
  xamarin: { type: 'FRAMEWORK', niche: 'mobile' },
  swiftui: { type: 'FRAMEWORK', niche: 'mobile' },
  'jetpack-compose': { type: 'FRAMEWORK', niche: 'mobile' },
  'kotlin-multiplatform': { type: 'FRAMEWORK', niche: 'mobile' },
};
