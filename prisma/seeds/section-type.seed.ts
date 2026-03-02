import type { Prisma, PrismaClient } from '@prisma/client';

interface SectionTypeSeedData {
  key: string;
  slug: string;
  title: string;
  description?: string;
  semanticKind: string;
  version: number;
  isRepeatable: boolean;
  minItems: number;
  maxItems?: number;
  definition: Prisma.InputJsonValue;
  uiSchema?: Prisma.InputJsonValue;
}

const sectionTypes: SectionTypeSeedData[] = [
  {
    key: 'skill_set_v1',
    slug: 'skills',
    title: 'Skills',
    description: 'Technical and professional skills',
    semanticKind: 'SKILL_SET',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'SKILL_SET',
      fields: [
        {
          key: 'name',
          type: 'string',
          required: true,
          semanticRole: 'SKILL_NAME',
          meta: { label: 'Skill Name' },
        },
        {
          key: 'category',
          type: 'string',
          required: false,
          semanticRole: 'CATEGORY',
          meta: { label: 'Category' },
        },
      ],
    },
  },
  {
    key: 'language_v1',
    slug: 'languages',
    title: 'Languages',
    description: 'Spoken languages and proficiency',
    semanticKind: 'LANGUAGE',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'LANGUAGE',
      fields: [
        {
          key: 'name',
          type: 'string',
          required: true,
          semanticRole: 'LANGUAGE_NAME',
          meta: { label: 'Language' },
        },
        {
          key: 'level',
          type: 'enum',
          required: true,
          semanticRole: 'PROFICIENCY',
          enum: ['BASIC', 'INTERMEDIATE', 'FLUENT', 'NATIVE'],
          meta: { label: 'Proficiency' },
        },
      ],
    },
  },
  {
    key: 'work_experience_v1',
    slug: 'work-experience',
    title: 'Experience',
    description: 'Professional work experience entries',
    semanticKind: 'WORK_EXPERIENCE',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'WORK_EXPERIENCE',
      fields: [
        {
          key: 'company',
          type: 'string',
          required: true,
          semanticRole: 'ORGANIZATION',
          meta: { label: 'Company' },
        },
        {
          key: 'role',
          type: 'string',
          required: true,
          semanticRole: 'JOB_TITLE',
          meta: { label: 'Role' },
        },
        {
          key: 'employmentType',
          type: 'enum',
          required: false,
          semanticRole: 'EMPLOYMENT_TYPE',
          enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
          meta: { label: 'Employment Type' },
        },
        {
          key: 'startDate',
          type: 'date',
          required: true,
          semanticRole: 'START_DATE',
          meta: { label: 'Start Date' },
        },
        {
          key: 'endDate',
          type: 'date',
          required: false,
          nullable: true,
          semanticRole: 'END_DATE',
          meta: { label: 'End Date', allowPresentFlag: true },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea' },
        },
        {
          key: 'achievements',
          type: 'array',
          required: false,
          semanticRole: 'HIGHLIGHTS',
          items: { type: 'string' },
          meta: { label: 'Key Achievements' },
        },
      ],
    },
  },
  {
    key: 'award_v1',
    slug: 'award',
    title: 'Award',
    description: 'Professional awards and recognitions',
    semanticKind: 'AWARD',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'AWARD',
      fields: [
        {
          key: 'title',
          type: 'string',
          required: true,
          semanticRole: 'TITLE',
          meta: { label: 'Award Title', minLength: 2 },
        },
        {
          key: 'issuer',
          type: 'string',
          required: true,
          semanticRole: 'ORGANIZATION',
          meta: { label: 'Issued By' },
        },
        {
          key: 'date',
          type: 'date',
          required: true,
          semanticRole: 'ISSUE_DATE',
          meta: { label: 'Date Received' },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea', maxLength: 1500 },
        },
        {
          key: 'proofUrl',
          type: 'string',
          required: false,
          semanticRole: 'PROOF_URL',
          meta: { label: 'Proof URL', format: 'uri' },
        },
      ],
    },
  },
  {
    key: 'education_v1',
    slug: 'education',
    title: 'Education',
    description: 'Academic history entries',
    semanticKind: 'EDUCATION',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'EDUCATION',
      fields: [
        {
          key: 'institution',
          type: 'string',
          required: true,
          semanticRole: 'ORGANIZATION',
          meta: { label: 'Institution' },
        },
        {
          key: 'degree',
          type: 'string',
          required: true,
          semanticRole: 'DEGREE',
          meta: { label: 'Degree' },
        },
        {
          key: 'field',
          type: 'string',
          required: false,
          semanticRole: 'FIELD_OF_STUDY',
          meta: { label: 'Field of Study' },
        },
        {
          key: 'startDate',
          type: 'date',
          required: false,
          semanticRole: 'START_DATE',
          meta: { label: 'Start Date' },
        },
        {
          key: 'endDate',
          type: 'date',
          required: false,
          nullable: true,
          semanticRole: 'END_DATE',
          meta: { label: 'End Date' },
        },
      ],
    },
  },
  {
    key: 'certification_v1',
    slug: 'certification',
    title: 'Certification',
    description: 'Professional certifications',
    semanticKind: 'CERTIFICATION',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'CERTIFICATION',
      fields: [
        {
          key: 'name',
          type: 'string',
          required: true,
          semanticRole: 'TITLE',
          meta: { label: 'Certification Name' },
        },
        {
          key: 'issuer',
          type: 'string',
          required: true,
          semanticRole: 'ORGANIZATION',
          meta: { label: 'Issuer' },
        },
        {
          key: 'issueDate',
          type: 'date',
          required: true,
          semanticRole: 'ISSUE_DATE',
          meta: { label: 'Issue Date' },
        },
        {
          key: 'expiryDate',
          type: 'date',
          required: false,
          nullable: true,
          semanticRole: 'EXPIRY_DATE',
          meta: { label: 'Expiry Date' },
        },
      ],
    },
  },
  {
    key: 'summary_v1',
    slug: 'summary',
    title: 'Summary',
    description: 'Professional summary section',
    semanticKind: 'SUMMARY',
    version: 1,
    isRepeatable: false,
    minItems: 1,
    maxItems: 1,
    definition: {
      schemaVersion: 1,
      kind: 'SUMMARY',
      fields: [
        {
          key: 'text',
          type: 'string',
          required: true,
          semanticRole: 'SUMMARY_TEXT',
          meta: {
            label: 'Summary',
            widget: 'textarea',
            minLength: 30,
            maxLength: 2000,
          },
        },
      ],
    },
  },
];

export async function seedSectionTypes(prisma: PrismaClient) {
  console.log('🧩 Seeding section types...');

  for (const sectionType of sectionTypes) {
    const { key, ...data } = sectionType;

    await prisma.sectionType.upsert({
      where: { key },
      update: data,
      create: {
        key,
        ...data,
      },
    });
  }

  console.log(`✅ Seeded ${sectionTypes.length} section types`);
}
