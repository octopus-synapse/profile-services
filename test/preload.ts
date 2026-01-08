/**
 * Bun test preload file
 * Sets up environment and global configurations before tests run
 */
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.test
config({ path: join(__dirname, '..', '.env.test'), override: false });
