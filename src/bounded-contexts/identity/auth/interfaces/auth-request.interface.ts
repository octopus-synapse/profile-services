/**
 * Domain-level auth interfaces
 * Note: We avoid importing Express to maintain domain purity
 */

export interface UserPayload {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  hasCompletedOnboarding: boolean;
}

export interface AuthenticatedRequest {
  user: UserPayload;
  // Extend with Request fields when needed at infrastructure layer
}
