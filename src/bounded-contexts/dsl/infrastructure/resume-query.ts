export const RESUME_RELATIONS_INCLUDE = {
  activeTheme: true,
  experiences: { orderBy: { order: 'asc' as const } },
  education: { orderBy: { startDate: 'desc' as const } },
  skills: { orderBy: { order: 'asc' as const } },
  languages: { orderBy: { order: 'asc' as const } },
  projects: { orderBy: { createdAt: 'desc' as const } },
  certifications: { orderBy: { issueDate: 'desc' as const } },
  awards: { orderBy: { date: 'desc' as const } },
  recommendations: { orderBy: { createdAt: 'desc' as const } },
  interests: { orderBy: { order: 'asc' as const } },
};
