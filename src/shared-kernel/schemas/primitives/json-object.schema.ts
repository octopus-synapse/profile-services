/**
 * A free-form JSON object column (Prisma `Json`).
 *
 * Two byte-identical copies of this lived in `resumes.routes.schemas.ts` and
 * `admin-section-types.routes.schemas.ts`. Splitting the management schemas
 * out of the first turned that duplication into an import cycle, which is the
 * usual way a copied definition finally announces itself.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const JsonObjectSchema = z
  .record(z.string(), z.unknown())
  .openapi({ example: { fields: [], translations: {} } });
