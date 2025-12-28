/**
 * GitHub Linguist Parser Service
 * Parses programming languages from GitHub's Linguist repository
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import * as yaml from 'js-yaml';
import type { GithubLanguagesYml, ParsedLanguage } from '../interfaces';

// Portuguese translations for common languages
const LANGUAGE_TRANSLATIONS: Record<string, string> = {
  JavaScript: 'JavaScript',
  TypeScript: 'TypeScript',
  Python: 'Python',
  Java: 'Java',
  'C#': 'C#',
  'C++': 'C++',
  C: 'C',
  Go: 'Go',
  Rust: 'Rust',
  Ruby: 'Ruby',
  PHP: 'PHP',
  Swift: 'Swift',
  Kotlin: 'Kotlin',
  Scala: 'Scala',
  R: 'R',
  MATLAB: 'MATLAB',
  Shell: 'Shell',
  Bash: 'Bash',
  PowerShell: 'PowerShell',
  SQL: 'SQL',
  HTML: 'HTML',
  CSS: 'CSS',
  Sass: 'Sass',
  SCSS: 'SCSS',
  Less: 'Less',
  'Objective-C': 'Objective-C',
  Dart: 'Dart',
  Lua: 'Lua',
  Perl: 'Perl',
  Haskell: 'Haskell',
  Elixir: 'Elixir',
  Erlang: 'Erlang',
  Clojure: 'Clojure',
  'F#': 'F#',
  Assembly: 'Assembly',
  COBOL: 'COBOL',
  Fortran: 'Fortran',
  Pascal: 'Pascal',
  Delphi: 'Delphi',
  'Visual Basic': 'Visual Basic',
  VBA: 'VBA',
  Groovy: 'Groovy',
  Julia: 'Julia',
  Zig: 'Zig',
  Nim: 'Nim',
  Crystal: 'Crystal',
  V: 'V',
  Solidity: 'Solidity',
  Move: 'Move',
  Cairo: 'Cairo',
  Vyper: 'Vyper',
};

// Language paradigms mapping
const LANGUAGE_PARADIGMS: Record<string, string[]> = {
  JavaScript: [
    'multi-paradigm',
    'event-driven',
    'functional',
    'imperative',
    'object-oriented',
  ],
  TypeScript: ['multi-paradigm', 'object-oriented', 'functional'],
  Python: ['multi-paradigm', 'object-oriented', 'functional', 'imperative'],
  Java: ['object-oriented', 'imperative'],
  'C#': ['multi-paradigm', 'object-oriented', 'functional'],
  'C++': ['multi-paradigm', 'object-oriented', 'procedural', 'functional'],
  C: ['procedural', 'imperative'],
  Go: ['concurrent', 'imperative', 'structured'],
  Rust: ['multi-paradigm', 'concurrent', 'functional', 'imperative'],
  Ruby: ['multi-paradigm', 'object-oriented', 'functional'],
  PHP: ['multi-paradigm', 'object-oriented', 'procedural'],
  Swift: [
    'multi-paradigm',
    'object-oriented',
    'functional',
    'protocol-oriented',
  ],
  Kotlin: ['multi-paradigm', 'object-oriented', 'functional'],
  Scala: ['multi-paradigm', 'object-oriented', 'functional'],
  Haskell: ['purely functional', 'lazy evaluation'],
  Elixir: ['functional', 'concurrent', 'distributed'],
  Erlang: ['functional', 'concurrent', 'distributed'],
  Clojure: ['functional', 'concurrent', 'lisp'],
  'F#': ['functional', 'object-oriented', 'imperative'],
  R: ['multi-paradigm', 'functional', 'object-oriented'],
  Julia: ['multi-paradigm', 'functional', 'multiple dispatch'],
  Dart: ['object-oriented', 'class-based'],
  Lua: ['multi-paradigm', 'scripting', 'imperative'],
};

// Typing system mapping
const LANGUAGE_TYPING: Record<string, string> = {
  JavaScript: 'dynamic',
  TypeScript: 'static',
  Python: 'dynamic',
  Java: 'static',
  'C#': 'static',
  'C++': 'static',
  C: 'static',
  Go: 'static',
  Rust: 'static',
  Ruby: 'dynamic',
  PHP: 'dynamic',
  Swift: 'static',
  Kotlin: 'static',
  Scala: 'static',
  Haskell: 'static',
  Elixir: 'dynamic',
  Erlang: 'dynamic',
  Clojure: 'dynamic',
  'F#': 'static',
  R: 'dynamic',
  Julia: 'dynamic',
  Dart: 'static',
  Lua: 'dynamic',
};

// Popular languages for ordering
const POPULARITY_ORDER: string[] = [
  'JavaScript',
  'Python',
  'TypeScript',
  'Java',
  'C#',
  'C++',
  'PHP',
  'C',
  'Go',
  'Rust',
  'Ruby',
  'Swift',
  'Kotlin',
  'Dart',
  'Scala',
  'R',
  'Shell',
  'PowerShell',
  'SQL',
  'HTML',
  'CSS',
  'Sass',
  'SCSS',
  'Objective-C',
  'Perl',
  'Haskell',
  'Elixir',
  'Erlang',
  'Clojure',
  'F#',
  'Lua',
  'Julia',
  'MATLAB',
  'Groovy',
  'Assembly',
  'COBOL',
  'Fortran',
  'Pascal',
  'Visual Basic',
  'VBA',
  'Solidity',
  'Move',
  'Cairo',
  'Vyper',
  'Zig',
  'Nim',
  'Crystal',
  'V',
];

@Injectable()
export class GithubLinguistParserService {
  private readonly LINGUIST_URL =
    'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml';

  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Fetch and parse languages from GitHub Linguist
   */
  async fetchAndParse(): Promise<ParsedLanguage[]> {
    this.logger.log('Fetching GitHub Linguist languages...');

    try {
      const response = await fetch(this.LINGUIST_URL);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`,
        );
      }

      const yamlContent = await response.text();
      const languages = yaml.load(yamlContent) as GithubLanguagesYml;

      return this.parseLanguages(languages);
    } catch (error) {
      this.logger.error('Failed to fetch GitHub Linguist', error);
      throw error;
    }
  }

  /**
   * Parse YAML content into structured language data
   */
  private parseLanguages(languages: GithubLanguagesYml): ParsedLanguage[] {
    const parsed: ParsedLanguage[] = [];

    for (const [name, lang] of Object.entries(languages)) {
      // Only include programming languages (skip data, markup, prose)
      if (lang.type !== 'programming') {
        continue;
      }

      const slug = this.createSlug(name);
      const popularityIndex = POPULARITY_ORDER.indexOf(name);

      parsed.push({
        slug,
        nameEn: name,
        namePtBr: LANGUAGE_TRANSLATIONS[name] || name,
        color: lang.color || null,
        extensions: lang.extensions || [],
        aliases: lang.aliases || [],
        paradigms: LANGUAGE_PARADIGMS[name] || [],
        typing: LANGUAGE_TYPING[name] || null,
        website: this.getLanguageWebsite(name),
        popularity: popularityIndex >= 0 ? 1000 - popularityIndex : 0,
      });
    }

    // Sort by popularity
    parsed.sort((a, b) => b.popularity - a.popularity);

    this.logger.log(`Parsed ${parsed.length} programming languages`);
    return parsed;
  }

  /**
   * Create URL-safe slug from language name
   */
  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[#+]+/g, (match) => {
        if (match === '#') return 'sharp';
        if (match === '++') return 'plusplus';
        if (match === '+') return 'plus';
        return '';
      })
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get official website for language
   */
  private getLanguageWebsite(name: string): string | null {
    const websites: Record<string, string> = {
      JavaScript: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      TypeScript: 'https://www.typescriptlang.org/',
      Python: 'https://www.python.org/',
      Java: 'https://www.java.com/',
      'C#': 'https://docs.microsoft.com/en-us/dotnet/csharp/',
      'C++': 'https://isocpp.org/',
      C: 'https://en.cppreference.com/w/c',
      Go: 'https://go.dev/',
      Rust: 'https://www.rust-lang.org/',
      Ruby: 'https://www.ruby-lang.org/',
      PHP: 'https://www.php.net/',
      Swift: 'https://swift.org/',
      Kotlin: 'https://kotlinlang.org/',
      Scala: 'https://www.scala-lang.org/',
      R: 'https://www.r-project.org/',
      Haskell: 'https://www.haskell.org/',
      Elixir: 'https://elixir-lang.org/',
      Erlang: 'https://www.erlang.org/',
      Clojure: 'https://clojure.org/',
      'F#': 'https://fsharp.org/',
      Julia: 'https://julialang.org/',
      Dart: 'https://dart.dev/',
      Lua: 'https://www.lua.org/',
      Perl: 'https://www.perl.org/',
      Zig: 'https://ziglang.org/',
      Nim: 'https://nim-lang.org/',
      Crystal: 'https://crystal-lang.org/',
      Solidity: 'https://soliditylang.org/',
    };

    return websites[name] || null;
  }
}
