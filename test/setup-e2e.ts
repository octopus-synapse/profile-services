import { config } from 'dotenv';
import { join } from 'path';

// Load .env.test file before tests run (don't override existing env vars from CI)
config({ path: join(__dirname, '..', '.env.test'), override: false });
