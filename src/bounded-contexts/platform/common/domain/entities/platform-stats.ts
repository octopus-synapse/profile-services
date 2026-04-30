/**
 * Aggregated platform statistics used by the platform stats endpoint
 * and any future monitoring surfaces. Stays decoupled from Nest/Prisma.
 */

export interface PlatformStats {
  readonly users: {
    readonly total: number;
    readonly privileged: number;
    readonly regular: number;
    readonly withOnboarding: number;
    readonly recentSignups: number;
  };
  readonly resumes: {
    readonly total: number;
  };
}

export interface PlatformStatsCounts {
  readonly totalUsers: number;
  readonly totalResumes: number;
  readonly usersWithOnboarding: number;
  readonly recentSignups: number;
  readonly privilegedUserCount: number;
}
