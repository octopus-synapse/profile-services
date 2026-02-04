/**
 * Stack Overflow Skill Categories - Libraries & Methodologies
 *
 * Maps general libraries, methodologies, and blockchain tags.
 */

import type { SkillType } from '../interfaces';

type SkillCategory = { type: SkillType; niche: string | null };

export const LIBRARY_CATEGORIES: Record<string, SkillCategory> = {
  jquery: { type: 'LIBRARY', niche: 'frontend' },
  lodash: { type: 'LIBRARY', niche: null },
  axios: { type: 'LIBRARY', niche: null },
  redux: { type: 'LIBRARY', niche: 'frontend' },
  zustand: { type: 'LIBRARY', niche: 'frontend' },
  mobx: { type: 'LIBRARY', niche: 'frontend' },
  rxjs: { type: 'LIBRARY', niche: null },
  graphql: { type: 'LIBRARY', niche: null },
  apollo: { type: 'LIBRARY', niche: null },
  'socket.io': { type: 'LIBRARY', niche: 'backend' },
  webpack: { type: 'TOOL', niche: 'frontend' },
  vite: { type: 'TOOL', niche: 'frontend' },
  rollup: { type: 'TOOL', niche: 'frontend' },
  esbuild: { type: 'TOOL', niche: 'frontend' },
  babel: { type: 'TOOL', niche: 'frontend' },
  eslint: { type: 'TOOL', niche: null },
  prettier: { type: 'TOOL', niche: null },
};

export const METHODOLOGY_CATEGORIES: Record<string, SkillCategory> = {
  agile: { type: 'METHODOLOGY', niche: null },
  scrum: { type: 'METHODOLOGY', niche: null },
  kanban: { type: 'METHODOLOGY', niche: null },
  tdd: { type: 'METHODOLOGY', niche: null },
  bdd: { type: 'METHODOLOGY', niche: null },
  'ci-cd': { type: 'METHODOLOGY', niche: 'devops' },
  devops: { type: 'METHODOLOGY', niche: 'devops' },
  microservices: { type: 'METHODOLOGY', niche: 'backend' },
  serverless: { type: 'METHODOLOGY', niche: 'backend' },
  rest: { type: 'METHODOLOGY', niche: null },
  restful: { type: 'METHODOLOGY', niche: null },
  api: { type: 'METHODOLOGY', niche: null },
  'design-patterns': { type: 'METHODOLOGY', niche: null },
  solid: { type: 'METHODOLOGY', niche: null },
  'clean-architecture': { type: 'METHODOLOGY', niche: null },
  ddd: { type: 'METHODOLOGY', niche: null },
  'event-driven': { type: 'METHODOLOGY', niche: null },
  cqrs: { type: 'METHODOLOGY', niche: null },
};

export const BLOCKCHAIN_CATEGORIES: Record<string, SkillCategory> = {
  solidity: { type: 'LANGUAGE', niche: 'blockchain' },
  web3: { type: 'LIBRARY', niche: 'blockchain' },
  'ethers.js': { type: 'LIBRARY', niche: 'blockchain' },
  hardhat: { type: 'TOOL', niche: 'blockchain' },
  truffle: { type: 'TOOL', niche: 'blockchain' },
  ethereum: { type: 'PLATFORM', niche: 'blockchain' },
};

export const IDE_CATEGORIES: Record<string, SkillCategory> = {
  vscode: { type: 'TOOL', niche: null },
  intellij: { type: 'TOOL', niche: null },
  vim: { type: 'TOOL', niche: null },
  neovim: { type: 'TOOL', niche: null },
  emacs: { type: 'TOOL', niche: null },
};
