import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_USER_ID } from './example-values.const';

extendZodWithOpenApi(z);

/** Route param: `/:userId` */
export const UserIdParamSchema = z.object({
  userId: z
    .string()
    .uuid('userId must be a valid UUID')
    .openapi({ example: EXAMPLE_USER_ID, description: 'Target user UUID (path parameter).' }),
});

export type UserIdParam = z.infer<typeof UserIdParamSchema>;
