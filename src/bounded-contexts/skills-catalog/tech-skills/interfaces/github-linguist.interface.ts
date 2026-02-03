/**
 * GitHub Linguist Types
 * Types for parsing GitHub's linguist repository
 */

export interface GithubLanguage {
  type: 'programming' | 'data' | 'markup' | 'prose';
  color?: string;
  extensions?: string[];
  filenames?: string[];
  aliases?: string[];
  interpreters?: string[];
  tm_scope?: string;
  ace_mode?: string;
  codemirror_mode?: string;
  codemirror_mime_type?: string;
  language_id?: number;
  group?: string;
  wrap?: boolean;
}

export interface GithubLanguagesYml {
  [name: string]: GithubLanguage;
}
