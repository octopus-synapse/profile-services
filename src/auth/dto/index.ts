// Backend-only DTOs (class-validator based)
export * from './change-email.dto';
export * from './delete-account.dto';
export * from './refresh-token.dto';
export * from './verification.dto';

// Re-export Zod types from schemas as DTOs (migrated to profile-contracts)
export type { LoginDto, SignupDto } from '../schemas/auth.schemas';
