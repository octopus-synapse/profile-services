/**
 * Resume Read Repository Port (Public Resumes context)
 *
 * Read-only resume access for public resume operations.
 */

export abstract class ResumeReadRepositoryPort {
  abstract findById(id: string): Promise<{ id: string; userId: string } | null>;

  abstract findByIdWithSections(id: string): Promise<{
    id: string;
    userId: string;
    resumeSections: Array<{
      sectionType: { semanticKind: string };
      items: Array<{ content: unknown }>;
    }>;
    [key: string]: unknown;
  } | null>;
}
