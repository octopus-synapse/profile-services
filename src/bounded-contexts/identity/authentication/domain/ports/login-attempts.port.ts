export interface LoginAttemptRecord {
  userId: string | null;
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureCode?: string;
}

export interface LoginLockStatus {
  locked: boolean;
  failureCount: number;
  lockUntil: Date | null;
  resetInSeconds: number | null;
}

export abstract class LoginAttemptsPort {
  abstract record(attempt: LoginAttemptRecord): Promise<void>;
  abstract getLockStatus(email: string): Promise<LoginLockStatus>;
  abstract clearFailedAttempts(email: string): Promise<void>;
}
