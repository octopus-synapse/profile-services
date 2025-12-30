/**
 * Tag Filter Utilities
 *
 * Functions to filter and validate Stack Overflow tags.
 */

/**
 * Programming languages handled by GitHub Linguist (not Stack Overflow)
 */
const PROGRAMMING_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'python',
  'java',
  'c#',
  'c++',
  'c',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'scala',
  'r',
  'perl',
  'haskell',
  'elixir',
  'erlang',
  'clojure',
  'f#',
  'lua',
  'dart',
  'julia',
  'matlab',
  'fortran',
  'cobol',
  'pascal',
  'assembly',
  'bash',
  'powershell',
  'shell',
  'objective-c',
  'groovy',
  'visual-basic',
  'vba',
  'delphi',
  'zig',
  'nim',
  'crystal',
  'v',
  'solidity',
]);

/**
 * Generic/non-tech tags to skip
 */
const SKIP_TAGS = new Set([
  'arrays',
  'string',
  'list',
  'dictionary',
  'object',
  'function',
  'class',
  'loops',
  'if-statement',
  'variables',
  'sorting',
  'regex',
  'date',
  'datetime',
  'file',
  'json',
  'xml',
  'csv',
  'image',
  'video',
  'audio',
  'math',
  'algorithm',
  'recursion',
  'debugging',
  'performance',
  'memory',
  'multithreading',
  'asynchronous',
  'oop',
  'inheritance',
  'polymorphism',
  'exception',
  'error-handling',
  'unit-testing',
  'logging',
  'authentication',
  'authorization',
  'encryption',
  'hashing',
  'http',
  'https',
  'tcp',
  'udp',
  'websocket',
  'cors',
  'cookies',
  'session',
  'cache',
  'optimization',
  'deployment',
  'documentation',
  'version-control',
  'code-review',
  'android',
  'ios',
  'windows',
  'macos',
  'ubuntu',
  'debian',
  'web',
  'mobile',
  'desktop',
  'server',
  'client',
  'browser',
  'database',
  'frontend',
  'backend',
  'fullstack',
]);

/**
 * Check if tag is a programming language
 */
export function isProgrammingLanguage(name: string): boolean {
  return PROGRAMMING_LANGUAGES.has(name.toLowerCase());
}

/**
 * Check if tag should be skipped
 */
export function shouldSkipTag(name: string): boolean {
  return SKIP_TAGS.has(name.toLowerCase());
}
