/**
 * Tech Niche DTO
 * Data transfer object for tech niches
 */

import type { TechAreaType } from '../interfaces';

export interface TechNiche {
  id: string;
  slug: string;
  nameEn: string;
  namePtBr: string;
  descriptionEn: string | null;
  descriptionPtBr: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  areaType: TechAreaType;
}
