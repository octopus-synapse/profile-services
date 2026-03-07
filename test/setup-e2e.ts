import { join } from 'node:path';
import { config } from 'dotenv';

// Load .env.test file before tests run (don't override existing env vars from CI)
config({ path: join(__dirname, '..', '.env.test'), override: false });
