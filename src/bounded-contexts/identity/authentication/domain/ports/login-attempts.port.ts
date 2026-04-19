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

export interface LoginAttemptsPort {
  record(attempt: LoginAttemptRecord): Promise<void>;
  getLockStatus(email: string): Promise<LoginLockStatus>;
  clearFailedAttempts(email: string): Promise<void>;
}

export const LOGIN_ATTEMPTS_PORT = Symbol('LoginAttemptsPort');
