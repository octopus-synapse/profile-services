/**
 * Import Job Test Fixtures
 */

import type { ImportJobData, JsonResumeSchema } from '../../domain/types/import.types';

export function createImportJobFixture(
  overrides: Partial<ImportJobData> = {},
): ImportJobData {
  return {
    id: 'import-1',
    userId: 'user-123',
    source: 'JSON',
    status: 'PENDING',
    fileUrl: null,
    fileName: null,
    rawData: { basics: { name: 'Test User' } },
    mappedData: null,
    errors: [],
    errorMessage: null,
    resumeId: null,
    metadata: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export const sampleJsonResume: JsonResumeSchema = {
  basics: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    summary: 'Software engineer with 5 years experience',
    location: { city: 'San Francisco', region: 'CA' },
    profiles: [
      { network: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' },
      { network: 'GitHub', url: 'https://github.com/johndoe' },
    ],
  },
  work: [
    {
      name: 'TechCorp',
      position: 'Senior Engineer',
      startDate: '2020-01-01',
      endDate: '2023-12-31',
      summary: 'Built scalable systems',
      highlights: ['Led team of 5', 'Increased performance by 50%'],
    },
  ],
  education: [
    {
      institution: 'MIT',
      area: 'Computer Science',
      studyType: 'Bachelor',
      startDate: '2014-09-01',
      endDate: '2018-06-01',
    },
  ],
  skills: [
    { name: 'JavaScript', keywords: ['Node.js', 'React'] },
    { name: 'Python', keywords: ['Django', 'FastAPI'] },
  ],
};

export const minimalJsonResume: JsonResumeSchema = {
  basics: { name: 'Jane Doe' },
};
