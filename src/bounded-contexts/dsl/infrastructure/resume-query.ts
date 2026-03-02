/**
 * Resume Query Includes
 *
 * Prisma include configurations for fetching resume with generic sections.
 */

export const RESUME_RELATIONS_INCLUDE = {
  activeTheme: true,
  resumeSections: {
    where: { isVisible: true },
    orderBy: { order: 'asc' as const },
    include: {
      sectionType: {
        select: {
          key: true,
          title: true,
          semanticKind: true,
        },
      },
      items: {
        where: { isVisible: true },
        orderBy: { order: 'asc' as const },
        select: {
          id: true,
          order: true,
          isVisible: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
};
