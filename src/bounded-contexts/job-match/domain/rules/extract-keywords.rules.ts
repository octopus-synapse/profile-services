/**
 * Deterministic skill-keyword extraction for jobs that don't carry a
 * recruiter-curated `skills[]` list — i.e. external/aggregated listings
 * (`ExternalJobListing`) whose only signal is free-text title + description.
 *
 * We intersect the job text against a curated tech-skill vocabulary instead
 * of tokenising raw prose. This keeps the Keyword sub-score meaningful
 * (`scoreKeywordMatch` = matched / required) and, just as important, keeps
 * the "missing" gaps shown in the UI to real skills rather than stop-words.
 *
 * Internal `Job` rows keep their explicit `skills[]`; this is only the
 * free-text fallback. The vocabulary is intentionally compact and
 * tech-focused (the product's inventory is tech-BR); extend it — or back it
 * with a catalog table — as coverage needs grow. Multi-word entries are
 * matched as substrings with symbol-tolerant boundaries so "react native",
 * "node.js", "c++" and "ci/cd" all resolve.
 */

const SKILL_VOCAB: readonly string[] = [
  // languages
  'javascript',
  'typescript',
  'python',
  'java',
  'kotlin',
  'swift',
  'golang',
  'rust',
  'ruby',
  'php',
  'c++',
  'c#',
  'scala',
  'elixir',
  'dart',
  'objective-c',
  'bash',
  'sql',
  'pl/sql',
  // frontend
  'react',
  'react native',
  'next.js',
  'vue',
  'vue.js',
  'nuxt',
  'angular',
  'svelte',
  'sveltekit',
  'redux',
  'tailwind',
  'tailwind css',
  'sass',
  'webpack',
  'vite',
  'html',
  'css',
  // backend / frameworks
  'node',
  'node.js',
  'express',
  'nestjs',
  'nest.js',
  'fastify',
  'django',
  'flask',
  'fastapi',
  'spring',
  'spring boot',
  'rails',
  'laravel',
  '.net',
  'asp.net',
  'graphql',
  'grpc',
  // mobile
  'android',
  'ios',
  'flutter',
  'expo',
  'jetpack compose',
  'swiftui',
  // data / ml
  'pandas',
  'numpy',
  'spark',
  'hadoop',
  'airflow',
  'dbt',
  'kafka',
  'tensorflow',
  'pytorch',
  'scikit-learn',
  'machine learning',
  'deep learning',
  'nlp',
  'data science',
  'etl',
  'databricks',
  'snowflake',
  'tableau',
  'power bi',
  'looker',
  // databases
  'postgresql',
  'postgres',
  'mysql',
  'mongodb',
  'redis',
  'elasticsearch',
  'dynamodb',
  'cassandra',
  'sqlite',
  'oracle',
  'sql server',
  'firestore',
  'neo4j',
  // cloud / devops
  'aws',
  'amazon web services',
  'gcp',
  'google cloud',
  'azure',
  'docker',
  'kubernetes',
  'k8s',
  'terraform',
  'ansible',
  'jenkins',
  'github actions',
  'gitlab ci',
  'ci/cd',
  'circleci',
  'helm',
  'prometheus',
  'grafana',
  'datadog',
  'linux',
  'nginx',
  'serverless',
  'lambda',
  // practices / tools
  'git',
  'agile',
  'scrum',
  'kanban',
  'jira',
  'tdd',
  'microservices',
  'rest api',
  'oauth',
  'jwt',
  'figma',
  'design system',
  // security
  'owasp',
  'penetration testing',
  'appsec',
  'iam',
];

const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

/** Symbol-tolerant boundary match: no adjacent alphanumeric on either side,
 *  so "java" doesn't fire inside "javascript" but "c++"/".net" still match. */
function boundaried(skill: string): RegExp {
  const escaped = skill.replace(ESCAPE_RE, '\\$&');
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
}

const COMPILED: ReadonlyArray<readonly [string, RegExp]> = SKILL_VOCAB.map(
  (skill) => [skill, boundaried(skill)] as const,
);

/**
 * Extracts known tech skills mentioned in free-text job copy. Returns the
 * canonical vocabulary spelling (deduped, capped) — never raw prose tokens.
 */
export function extractSkillKeywords(text: string, max = 25): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const [skill, re] of COMPILED) {
    if (out.length >= max) break;
    if (re.test(text)) out.push(skill);
  }
  return out;
}
