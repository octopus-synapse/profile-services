/**
 * Course DTOs
 * Single Responsibility: Data Transfer Objects for courses
 */

export interface CourseDto {
  id: string;
  codigoCurso: number;
  nome: string;
  grau: string | null;
  modalidade: string | null;
  areaConhecimento: string | null;
  institution: InstitutionBasicDto;
}

export interface InstitutionBasicDto {
  nome: string;
  sigla: string | null;
  uf: string;
}
