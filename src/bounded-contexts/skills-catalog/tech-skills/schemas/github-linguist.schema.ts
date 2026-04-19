import { z } from 'zod';
import type { GithubLanguage, GithubLanguagesYml } from '../interfaces/github-linguist.interface';

const githubLanguageSchema = z.object({
  type: z.enum(['programming', 'data', 'markup', 'prose']),
  color: z.string().optional(),
  extensions: z.array(z.string()).optional(),
  filenames: z.array(z.string()).optional(),
  aliases: z.array(z.string()).optional(),
  interpreters: z.array(z.string()).optional(),
  tm_scope: z.string().optional(),
  ace_mode: z.string().optional(),
  codemirror_mode: z.string().optional(),
  codemirror_mime_type: z.string().optional(),
  language_id: z.number().optional(),
  group: z.string().optional(),
  wrap: z.boolean().optional(),
});

export const githubLanguagesYmlSchema: z.ZodType<GithubLanguagesYml> = z.record(
  z.string(),
  githubLanguageSchema,
);

// Compile-time guarantee the Zod schema matches the interface.
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _assert: AssertEqual<z.infer<typeof githubLanguageSchema>, GithubLanguage> = true;
void _assert;
