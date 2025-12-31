/**
 * Institution DTOs
 * Single Responsibility: Data Transfer Objects for institutions
 */

export interface InstitutionDto {
  id: string;
  codigoIes: number;
  nome: string;
  sigla: string | null;
  uf: string;
  municipio: string | null;
  categoria: string | null;
  organizacao: string | null;
}

export interface InstitutionWithCoursesDto extends InstitutionDto {
  courses: CourseBasicDto[];
}

export interface CourseBasicDto {
  id: string;
  codigoCurso: number;
  nome: string;
  grau: string | null;
  modalidade: string | null;
  areaConhecimento: string | null;
}
