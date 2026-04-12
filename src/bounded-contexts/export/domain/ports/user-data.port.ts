/**
 * User Data Port
 *
 * Abstraction for user data needed by export operations.
 * Implemented by infrastructure adapter that delegates to identity BC.
 */

export type ExportUserData = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  photoURL: string | null;
};

export abstract class UserDataPort {
  abstract findById(userId: string): Promise<ExportUserData | null>;
}
