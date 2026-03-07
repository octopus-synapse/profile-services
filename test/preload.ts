/**
 * Bun test preload file
 * Sets up environment and global configurations before tests run
 */

import { join } from 'node:path';
import { config } from 'dotenv';

// Load .env.test
config({ path: join(__dirname, '..', '.env.test'), override: false });
