/**
 * Tech Skills Data
 * Single Responsibility: Load tech skills configuration data
 */

import { TechAreaType } from '../interfaces';
import * as path from 'path';
import * as fs from 'fs';

export interface TechAreaData {
  type: TechAreaType;
  nameEn: string;
  namePtBr: string;
  descriptionEn: string;
  descriptionPtBr: string;
  icon: string;
  color: string;
  order: number;
}

export interface TechNicheData {
  slug: string;
  areaType: TechAreaType;
  nameEn: string;
  namePtBr: string;
  descriptionEn: string;
  descriptionPtBr: string;
  icon: string;
  color: string;
  order: number;
}

interface TechSkillsDataFile {
  techAreas: TechAreaData[];
  techNiches: TechNicheData[];
}

function loadTechSkillsData(): TechSkillsDataFile {
  // In development mode, __dirname is /app/dist/src/tech-skills/data
  // In production mode, __dirname is /app/dist/src/tech-skills/data
  // Data folder is mounted at /app/data in dev, or copied to /app/dist/data in prod
  // We need to check both locations
  const distDataPath = path.resolve(
    __dirname,
    '../../../data/tech-skills-data.json',
  );
  const srcDataPath = path.resolve(process.cwd(), 'data/tech-skills-data.json');

  const dataPath = fs.existsSync(srcDataPath) ? srcDataPath : distDataPath;
  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(fileContent) as TechSkillsDataFile;
}

const techSkillsData = loadTechSkillsData();

export const TECH_AREAS: TechAreaData[] = techSkillsData.techAreas;
export const TECH_NICHES: TechNicheData[] = techSkillsData.techNiches;
