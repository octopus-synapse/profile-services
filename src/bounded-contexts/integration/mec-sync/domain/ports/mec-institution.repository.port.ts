/**
 * Outbound port for MEC institution persistence. Adapters expose the
 * read-side queries the controller stack needs (list / search / by-code
 * / by-state) plus the bulk-insert + existing-codes lookup the sync
 * pipeline relies on.
 */

import type { CourseBasic, Institution } from '../../schemas/mec.schema';
import type { NormalizedInstitution } from '../entities/mec-row';

export interface InstitutionWithCoursesRow {
  id: string;
  codigoIes: number;
  nome: string;
  sigla: string | null;
  uf: string;
  municipio: string | null;
  categoria: string | null;
  organizacao: string | null;
  courses: CourseBasic[];
}

export abstract class MecInstitutionRepositoryPort {
  abstract findAllActiveInstitutions(): Promise<Institution[]>;
  abstract findInstitutionsByUf(uf: string): Promise<Institution[]>;
  abstract findInstitutionByCode(codigoIes: number): Promise<InstitutionWithCoursesRow | null>;
  abstract searchInstitutionsByName(query: string, limit: number): Promise<Institution[]>;
  abstract findAllDistinctUfs(): Promise<string[]>;
  abstract countInstitutionsByUf(): Promise<Array<{ uf: string; _count: number }>>;
  abstract countActiveInstitutions(): Promise<number>;
  abstract findAllExistingInstitutionCodes(): Promise<Set<number>>;
  abstract bulkCreateInstitutions(rows: NormalizedInstitution[]): Promise<number>;
}
