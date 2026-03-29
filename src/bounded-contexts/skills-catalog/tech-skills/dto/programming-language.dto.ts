/**
 * Programming Language DTO
 * Data transfer object for programming languages
 */

export interface ProgrammingLanguage {
  id: string;
  slug: string;
  nameEn: string;
  namePtBr: string;
  color: string | null;
  website: string | null;
  aliases: string[];
  fileExtensions: string[];
  paradigms: string[];
  typing: string | null;
  popularity: number;
}
