import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';
import * as path from 'node:path';

// Load .env but don't override existing environment variables
// This allows test scripts to set DATABASE_URL before loading
config({ override: false });

export default defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
});
