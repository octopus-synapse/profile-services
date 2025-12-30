/**
 * Tech Skills Data
 * Single Responsibility: Load tech skills configuration data
 */

import { TechAreaType } from '../interfaces';
import techSkillsData from '../../../data/tech-skills-data.json';

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

export const TECH_AREAS: TechAreaData[] =
  techSkillsData.techAreas as TechAreaData[];
export const TECH_NICHES: TechNicheData[] =
  techSkillsData.techNiches as TechNicheData[];
