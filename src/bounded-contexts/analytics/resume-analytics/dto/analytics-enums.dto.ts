import { z } from 'zod';

export const IndustryEnum = z.enum([
  'software_engineering',
  'data_science',
  'devops',
  'product_management',
  'design',
  'marketing',
  'finance',
  'healthcare',
  'education',
  'other',
]);

export const ExperienceLevelEnum = z.enum([
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
  'executive',
]);

export const PeriodEnum = z.enum(['day', 'week', 'month', 'year']);
export const SeverityEnum = z.enum(['low', 'medium', 'high']);
export const PriorityEnum = z.enum(['low', 'medium', 'high']);
export const TrendEnum = z.enum(['improving', 'stable', 'declining']);
