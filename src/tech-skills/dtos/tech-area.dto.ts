/**
 * Tech Area DTO
 * Data transfer object for tech areas
 */

import type { TechAreaType } from '../interfaces';

export interface TechAreaDto {
  id: string;
  type: TechAreaType;
  nameEn: string;
  namePtBr: string;
  descriptionEn: string | null;
  descriptionPtBr: string | null;
  icon: string | null;
  color: string | null;
  order: number;
}
