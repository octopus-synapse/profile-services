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
  const dataPath = path.resolve(
    __dirname,
    '../../../data/tech-skills-data.json',
  );
  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(fileContent) as TechSkillsDataFile;
}

const techSkillsData = loadTechSkillsData();

export const TECH_AREAS: TechAreaData[] = techSkillsData.techAreas;
export const TECH_NICHES: TechNicheData[] = techSkillsData.techNiches;
