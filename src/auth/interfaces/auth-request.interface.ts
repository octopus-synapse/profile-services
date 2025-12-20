import { Request } from 'express';

export interface UserPayload {
  userId: string;
  email: string;
  name?: string;
  hasCompletedOnboarding: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}
