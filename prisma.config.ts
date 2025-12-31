import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import * as path from 'node:path';

export default defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
});

