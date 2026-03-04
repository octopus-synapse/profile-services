/**
 * E2E Test Fixtures - Resume Data
 *
 * Reusable resume data for E2E tests.
 * Follows the same format as integration tests.
 */

/**
 * Creates a minimal onboarding payload.
 * Use a unique username per test to avoid collisions.
 */
export function createMinimalOnboardingData(suffix?: string) {
  const uniqueSuffix = suffix || Date.now().toString();
  // Username must use underscores, not hyphens (validation rule)
  const sanitizedSuffix = uniqueSuffix.replace(/-/g, '_');
  return {
    username: `e2e_${sanitizedSuffix}`,
    personalInfo: {
      fullName: 'E2E Test User',
      email: 'e2e@example.com',
    },
    professionalProfile: {
      jobTitle: 'Software Developer',
      summary: 'Experienced developer with modern web technologies.',
    },
    skills: [],
    noSkills: true,
    experiences: [],
    noExperience: true,
    education: [],
    noEducation: true,
    languages: [{ name: 'English', level: 'NATIVE' }],
    templateSelection: { template: 'PROFESSIONAL', palette: 'DEFAULT' },
  };
}

/**
 * Creates a full onboarding payload with all sections.
 */
export function createFullOnboardingData(suffix?: string) {
  const uniqueSuffix = suffix || Date.now().toString();
  // Username must use underscores, not hyphens (validation rule)
  const sanitizedSuffix = uniqueSuffix.replace(/-/g, '_');
  return {
    username: `e2e_full_${sanitizedSuffix}`,
    personalInfo: {
      fullName: 'E2E Full Profile User',
      email: 'e2e-full@example.com',
    },
    professionalProfile: {
      jobTitle: 'Lead Engineer',
      summary:
        'Full-stack engineer with 10+ years building scalable applications.',
    },
    skills: [
      { name: 'TypeScript', category: 'Programming' },
      { name: 'Node.js', category: 'Programming' },
      { name: 'React', category: 'Programming' },
    ],
    noSkills: false,
    experiences: [
      {
        company: 'Tech Corp',
        position: 'Senior Engineer',
        startDate: '2020-01',
        endDate: '2023-12',
        description: 'Led development of microservices architecture',
      },
    ],
    noExperience: false,
    education: [
      {
        institution: 'Tech University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: '2014-09',
        endDate: '2018-05',
      },
    ],
    noEducation: false,
    languages: [{ name: 'English', level: 'NATIVE' }],
    templateSelection: { template: 'PROFESSIONAL', palette: 'DEFAULT' },
  };
}

// Legacy exports for backwards compatibility
export const minimalOnboardingData = createMinimalOnboardingData();
export const fullOnboardingData = createFullOnboardingData();

export const createResumeData = (title: string) => ({
  title,
  summary: `${title} - Professional summary for E2E testing`,
});

export const createExperienceData = (company: string) => ({
  company,
  position: 'Software Engineer',
  startDate: '2020-01',
  endDate: '2023-12',
  description: `Worked at ${company} as a software engineer`,
});

export const createEducationData = (institution: string) => ({
  institution,
  degree: 'Bachelor of Science',
  field: 'Computer Science',
  startDate: '2016-09',
  endDate: '2020-05',
});

export const createSkillData = (name: string, category = 'Programming') => ({
  name,
  category,
});

/**
 * Creates resume data with full contact information for CRUD testing.
 * Includes all personal info fields for comprehensive export/display tests.
 *
 * @param suffix - Optional suffix for unique identifiers
 * @returns Complete resume creation payload
 */
export function createResumeWithSections(suffix?: string) {
  const uniqueSuffix = suffix || Date.now().toString();
  return {
    title: `Professional Resume ${uniqueSuffix}`,
    summary:
      'Experienced software engineer with expertise in full-stack development and modern web technologies.',
    fullName: 'E2E Test User',
    jobTitle: 'Senior Software Engineer',
    emailContact: `test-${uniqueSuffix}@example.com`,
    phone: '+1234567890',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/test-user',
    github: 'https://github.com/test-user',
  };
}

/**
 * Creates generic section item content based on section type.
 * Works with the dynamic section system - discovers section types first,
 * then creates appropriate content.
 *
 * @param sectionTypeKey - Section type key (e.g., 'work_experience_v1')
 * @returns Section item payload with content object
 */
export function createSectionItemContent(sectionTypeKey: string) {
  const contentMap: Record<string, Record<string, any>> = {
    work_experience_v1: {
      company: 'Tech Corp',
      position: 'Senior Engineer',
      startDate: '2020-01',
      endDate: '2023-12',
      description: 'Led development of microservices architecture',
      current: false,
      location: 'San Francisco, CA',
    },
    education_v1: {
      institution: 'Tech University',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: '2016-09',
      endDate: '2020-05',
      description: 'Focus on software engineering and algorithms',
      gpa: '3.8',
    },
    skill_v1: {
      name: 'TypeScript',
      level: 'ADVANCED',
      category: 'Programming',
      yearsOfExperience: 5,
    },
    project_v1: {
      name: 'E-commerce Platform',
      description: 'Built scalable e-commerce platform using Node.js and React',
      url: 'https://github.com/test/project',
      startDate: '2021-01',
      endDate: '2022-12',
    },
    certification_v1: {
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      issueDate: '2022-06',
      expiryDate: '2025-06',
      credentialId: 'AWS-12345',
      url: 'https://aws.amazon.com/verification',
    },
    language_v1: {
      name: 'English',
      level: 'NATIVE',
    },
  };

  return {
    content:
      contentMap[sectionTypeKey] || {
        description: 'Generic section item content',
      },
  };
}
