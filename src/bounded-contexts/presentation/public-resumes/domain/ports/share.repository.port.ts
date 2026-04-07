/**
 * Share Repository Port
 *
 * Abstraction for share persistence operations.
 */

export type ShareEntity = {
  id: string;
  resumeId: string;
  slug: string;
  password: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ShareWithResume = ShareEntity & {
  resume: {
    id: string;
    userId: string;
    [key: string]: unknown;
  };
};

export abstract class ShareRepositoryPort {
  abstract create(data: {
    resumeId: string;
    slug: string;
    password: string | null;
    expiresAt: Date | null;
  }): Promise<ShareEntity>;

  abstract findBySlug(slug: string): Promise<ShareWithResume | null>;
  abstract findBySlugOnly(slug: string): Promise<ShareEntity | null>;

  abstract findByIdWithResume(id: string): Promise<
    | (ShareEntity & {
        resume: { userId: string };
      })
    | null
  >;

  abstract findByResumeId(resumeId: string): Promise<ShareEntity[]>;

  abstract delete(id: string): Promise<ShareEntity>;
}
