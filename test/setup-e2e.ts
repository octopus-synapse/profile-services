import { config } from 'dotenv';
import { join } from 'path';

// Load .env.test file before tests run
config({ path: join(__dirname, '..', '.env.test') });
