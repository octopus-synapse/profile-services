/**
 * Display Name Formatter
 *
 * Formats skill tags for display with proper capitalization.
 */

const SPECIAL_CASES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  reactjs: 'React',
  vuejs: 'Vue.js',
  angularjs: 'AngularJS',
  nextjs: 'Next.js',
  nuxtjs: 'Nuxt.js',
  expressjs: 'Express',
  nestjs: 'NestJS',
  graphql: 'GraphQL',
  mongodb: 'MongoDB',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  aws: 'AWS',
  gcp: 'Google Cloud',
  css: 'CSS',
  html: 'HTML',
  sql: 'SQL',
  api: 'API',
  rest: 'REST',
  oauth: 'OAuth',
  jwt: 'JWT',
  'ci-cd': 'CI/CD',
  devops: 'DevOps',
  ios: 'iOS',
  macos: 'macOS',
};

/**
 * Format tag name for display
 */
export function formatDisplayName(name: string): string {
  const lower = name.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(SPECIAL_CASES, lower)) {
    return SPECIAL_CASES[lower];
  }

  // Title case
  return name
    .split(/[-_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize tag name to slug
 */
export function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
