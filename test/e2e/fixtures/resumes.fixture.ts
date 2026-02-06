/**
 * E2E Test Fixtures - Resume Data
 *
 * Reusable resume data for E2E tests
 */

export const minimalOnboardingData = {
  username: `e2e-user-${Date.now()}`,
  personalInfo: {
    fullName: 'E2E Test User',
    headline: 'Software Engineer',
    email: 'e2e@example.com',
    phone: '+1234567890',
    location: 'San Francisco, CA',
  },
  professionalProfile: {
    jobTitle: 'Senior Developer',
    summary:
      'Experienced software engineer with expertise in full-stack development and testing automation.',
  },
  skills: [
    { name: 'TypeScript', category: 'Language' },
    { name: 'Node.js', category: 'Framework' },
  ],
  noSkills: false,
  experiences: [],
  noExperience: true,
  education: [],
  noEducation: true,
};

export const fullOnboardingData = {
  username: `e2e-full-${Date.now()}`,
  personalInfo: {
    fullName: 'E2E Full Profile User',
    headline: 'Full Stack Engineer',
    email: 'e2e-full@example.com',
    phone: '+1987654321',
    location: 'New York, NY',
    website: 'https://example.com',
  },
  professionalProfile: {
    jobTitle: 'Lead Engineer',
    summary:
      'Highly experienced full-stack engineer with 10+ years building scalable applications using modern technologies.',
  },
  skills: [
    { name: 'TypeScript', category: 'Language' },
    { name: 'JavaScript', category: 'Language' },
    { name: 'Python', category: 'Language' },
    { name: 'React', category: 'Framework' },
    { name: 'Node.js', category: 'Framework' },
    { name: 'PostgreSQL', category: 'Database' },
  ],
  noSkills: false,
  experiences: [
    {
      company: 'Tech Corp',
      position: 'Senior Engineer',
      startDate: '2020-01-01',
      endDate: '2024-01-01',
      description: 'Led development of microservices architecture',
      location: 'San Francisco, CA',
      current: false,
    },
    {
      company: 'Startup Inc',
      position: 'Full Stack Developer',
      startDate: '2018-01-01',
      endDate: '2019-12-31',
      description: 'Built and deployed multiple web applications',
      location: 'Remote',
      current: false,
    },
  ],
  noExperience: false,
  education: [
    {
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: '2014-09-01',
      endDate: '2018-05-31',
      grade: '3.8 GPA',
    },
  ],
  noEducation: false,
};

export const createResumeData = (title: string) => ({
  title,
  summary: `${title} - Professional summary for E2E testing`,
});

export const createExperienceData = (company: string) => ({
  company,
  position: 'Software Engineer',
  startDate: '2020-01-01',
  endDate: '2023-12-31',
  description: `Worked at ${company} as a software engineer`,
  location: 'Remote',
  current: false,
});

export const createEducationData = (institution: string) => ({
  institution,
  degree: 'Bachelor of Science',
  field: 'Computer Science',
  startDate: '2016-09-01',
  endDate: '2020-05-31',
  grade: '3.5 GPA',
});

export const createSkillData = (name: string, category = 'Language') => ({
  name,
  category,
});
