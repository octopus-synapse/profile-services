import type { Prisma, PrismaClient } from '@prisma/client';

export interface SectionTypeSeedData {
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

export const sectionTypes: SectionTypeSeedData[] = [
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
      ats: {
        isMandatory: true,
        recommendedPosition: 4,
        sectionDetection: {
          keywords: ['skills', 'abilities', 'competencies', 'expertise'],
          multiWord: ['technical skills', 'core competencies', 'key skills'],
        },
        scoring: {
          baseScore: 40,
          fieldWeights: { SKILL_NAME: 50, CATEGORY: 10 },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'skills',
          fieldMapping: { name: 'name', category: 'keywords[0]' },
        },
        dsl: { sectionId: 'skills', astType: 'skills' },
      },
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
      ats: {
        isMandatory: false,
        recommendedPosition: 9,
        sectionDetection: {
          keywords: ['languages', 'fluency'],
          multiWord: ['language skills', 'spoken languages'],
        },
        scoring: {
          baseScore: 35,
          fieldWeights: { LANGUAGE_NAME: 50, PROFICIENCY: 15 },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'languages',
          fieldMapping: { name: 'language', level: 'fluency' },
        },
        dsl: { sectionId: 'languages', astType: 'languages' },
      },
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
      ats: {
        isMandatory: true,
        recommendedPosition: 2,
        sectionDetection: {
          keywords: ['experience', 'employment', 'work', 'history', 'career'],
          multiWord: ['work experience', 'professional experience', 'employment history'],
        },
        scoring: {
          baseScore: 30,
          fieldWeights: {
            ORGANIZATION: 20,
            JOB_TITLE: 20,
            START_DATE: 15,
            END_DATE: 10,
            DESCRIPTION: 5,
          },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'work',
          fieldMapping: {
            company: 'name',
            role: 'position',
            startDate: 'startDate',
            endDate: 'endDate',
            description: 'summary',
            achievements: 'highlights',
          },
        },
        dsl: { sectionId: 'experience', astType: 'experience' },
        docx: {
          titleField: 'role',
          subtitleField: 'company',
          dateFields: ['startDate', 'endDate'],
          descriptionField: 'description',
          listFields: ['achievements'],
        },
      },
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
      ats: {
        isMandatory: false,
        recommendedPosition: 7,
        sectionDetection: {
          keywords: ['awards', 'honors', 'recognitions'],
          multiWord: ['awards and honors', 'recognitions and awards'],
        },
        scoring: {
          baseScore: 35,
          fieldWeights: {
            TITLE: 30,
            ORGANIZATION: 20,
            ISSUE_DATE: 10,
            DESCRIPTION: 5,
          },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'awards',
          fieldMapping: {
            title: 'title',
            issuer: 'awarder',
            date: 'date',
            description: 'summary',
          },
        },
        dsl: { sectionId: 'awards', astType: 'awards' },
        docx: {
          titleField: 'title',
          subtitleField: 'issuer',
          dateFields: ['date'],
          descriptionField: 'description',
        },
      },
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
      ats: {
        isMandatory: true,
        recommendedPosition: 3,
        sectionDetection: {
          keywords: ['education', 'academic', 'studies', 'degree'],
          multiWord: ['academic background', 'educational background'],
        },
        scoring: {
          baseScore: 35,
          fieldWeights: {
            ORGANIZATION: 20,
            DEGREE: 25,
            START_DATE: 10,
            END_DATE: 10,
          },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'education',
          fieldMapping: {
            institution: 'institution',
            degree: 'studyType',
            field: 'area',
            startDate: 'startDate',
            endDate: 'endDate',
          },
        },
        dsl: { sectionId: 'education', astType: 'education' },
        docx: {
          titleField: 'degree',
          subtitleField: 'institution',
          dateFields: ['startDate', 'endDate'],
        },
      },
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
      ats: {
        isMandatory: false,
        recommendedPosition: 5,
        sectionDetection: {
          keywords: ['certifications', 'certificates', 'credentials', 'licenses'],
          multiWord: ['professional certifications', 'licenses and certifications'],
        },
        scoring: {
          baseScore: 40,
          fieldWeights: { TITLE: 30, ORGANIZATION: 20, ISSUE_DATE: 10 },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'certificates',
          fieldMapping: { name: 'name', issuer: 'issuer', issueDate: 'date' },
        },
        dsl: { sectionId: 'certifications', astType: 'certifications' },
        docx: {
          titleField: 'name',
          subtitleField: 'issuer',
          dateFields: ['issueDate', 'expiryDate'],
        },
      },
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
      ats: {
        isMandatory: false,
        recommendedPosition: 1,
        sectionDetection: {
          keywords: ['summary', 'profile', 'objective', 'about'],
          multiWord: ['professional summary', 'career objective', 'about me'],
        },
        scoring: {
          baseScore: 50,
          fieldWeights: { SUMMARY_TEXT: 50 },
        },
      },
      export: {
        dsl: { sectionId: 'summary', astType: 'summary' },
      },
    },
  },
  {
    key: 'project_v1',
    slug: 'projects',
    title: 'Projects',
    description: 'Personal or professional projects',
    semanticKind: 'PROJECT',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'PROJECT',
      fields: [
        {
          key: 'name',
          type: 'string',
          required: true,
          semanticRole: 'TITLE',
          meta: { label: 'Project Name' },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea' },
        },
        {
          key: 'url',
          type: 'string',
          required: false,
          semanticRole: 'URL',
          meta: { label: 'Project URL', format: 'uri' },
        },
        {
          key: 'repositoryUrl',
          type: 'string',
          required: false,
          semanticRole: 'REPOSITORY_URL',
          meta: { label: 'Repository URL', format: 'uri' },
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
        {
          key: 'technologies',
          type: 'array',
          required: false,
          semanticRole: 'TECHNOLOGIES',
          items: { type: 'string' },
          meta: { label: 'Technologies Used' },
        },
        {
          key: 'highlights',
          type: 'array',
          required: false,
          semanticRole: 'HIGHLIGHTS',
          items: { type: 'string' },
          meta: { label: 'Key Highlights' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 6,
        sectionDetection: {
          keywords: ['projects', 'portfolio', 'work'],
          multiWord: ['personal projects', 'side projects'],
        },
        scoring: {
          baseScore: 35,
          fieldWeights: { TITLE: 30, DESCRIPTION: 20, TECHNOLOGIES: 15 },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'projects',
          fieldMapping: {
            name: 'name',
            description: 'description',
            url: 'url',
            startDate: 'startDate',
            endDate: 'endDate',
            technologies: 'keywords',
            highlights: 'highlights',
          },
        },
        dsl: { sectionId: 'projects', astType: 'projects' },
        docx: {
          titleField: 'name',
          descriptionField: 'description',
          dateFields: ['startDate', 'endDate'],
          listFields: ['technologies', 'highlights'],
        },
      },
    },
  },
  {
    key: 'publication_v1',
    slug: 'publications',
    title: 'Publications',
    description: 'Academic or professional publications',
    semanticKind: 'PUBLICATION',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'PUBLICATION',
      fields: [
        {
          key: 'title',
          type: 'string',
          required: true,
          semanticRole: 'TITLE',
          meta: { label: 'Publication Title' },
        },
        {
          key: 'publisher',
          type: 'string',
          required: true,
          semanticRole: 'ORGANIZATION',
          meta: { label: 'Publisher / Journal' },
        },
        {
          key: 'date',
          type: 'date',
          required: true,
          semanticRole: 'ISSUE_DATE',
          meta: { label: 'Publication Date' },
        },
        {
          key: 'url',
          type: 'string',
          required: false,
          semanticRole: 'URL',
          meta: { label: 'Publication URL', format: 'uri' },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 10,
        sectionDetection: {
          keywords: ['publications', 'papers', 'articles'],
          multiWord: ['published works', 'research papers'],
        },
        scoring: {
          baseScore: 30,
          fieldWeights: { TITLE: 30, ORGANIZATION: 20, ISSUE_DATE: 10 },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'publications',
          fieldMapping: {
            title: 'name',
            publisher: 'publisher',
            date: 'releaseDate',
            url: 'url',
            description: 'summary',
          },
        },
        dsl: { sectionId: 'publications', astType: 'publications' },
        docx: {
          titleField: 'title',
          subtitleField: 'publisher',
          dateFields: ['date'],
          descriptionField: 'description',
        },
      },
    },
  },
  {
    key: 'interest_v1',
    slug: 'interests',
    title: 'Interests',
    description: 'Personal interests and hobbies',
    semanticKind: 'INTEREST',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'INTEREST',
      fields: [
        {
          key: 'name',
          type: 'string',
          required: true,
          semanticRole: 'INTEREST_NAME',
          meta: { label: 'Interest' },
        },
        {
          key: 'keywords',
          type: 'array',
          required: false,
          semanticRole: 'KEYWORDS',
          items: { type: 'string' },
          meta: { label: 'Keywords' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 15,
        sectionDetection: {
          keywords: ['interests', 'hobbies', 'activities'],
          multiWord: ['personal interests', 'hobbies and interests'],
        },
        scoring: {
          baseScore: 10,
          fieldWeights: { INTEREST_NAME: 10 },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'interests',
          fieldMapping: { name: 'name', keywords: 'keywords' },
        },
        dsl: { sectionId: 'interests', astType: 'interests' },
      },
    },
  },
  {
    key: 'recommendation_v1',
    slug: 'recommendations',
    title: 'Recommendations',
    description: 'Professional recommendations and references',
    semanticKind: 'RECOMMENDATION',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'RECOMMENDATION',
      fields: [
        {
          key: 'name',
          type: 'string',
          required: true,
          semanticRole: 'PERSON_NAME',
          meta: { label: 'Recommender Name' },
        },
        {
          key: 'role',
          type: 'string',
          required: false,
          semanticRole: 'JOB_TITLE',
          meta: { label: 'Role / Title' },
        },
        {
          key: 'company',
          type: 'string',
          required: false,
          semanticRole: 'ORGANIZATION',
          meta: { label: 'Company' },
        },
        {
          key: 'email',
          type: 'string',
          required: false,
          semanticRole: 'EMAIL',
          meta: { label: 'Email', format: 'email' },
        },
        {
          key: 'phone',
          type: 'string',
          required: false,
          semanticRole: 'PHONE',
          meta: { label: 'Phone' },
        },
        {
          key: 'text',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Recommendation Text', widget: 'textarea' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 14,
        sectionDetection: {
          keywords: ['references', 'recommendations', 'referees'],
          multiWord: ['professional references'],
        },
        scoring: {
          baseScore: 20,
          fieldWeights: { PERSON_NAME: 15, ORGANIZATION: 5 },
        },
      },
      export: {
        jsonResume: {
          sectionKey: 'references',
          fieldMapping: {
            name: 'name',
            text: 'reference',
          },
        },
        dsl: { sectionId: 'recommendations', astType: 'recommendations' },
        docx: {
          titleField: 'name',
          subtitleField: 'role',
          descriptionField: 'text',
        },
      },
    },
  },
  {
    key: 'hackathon_v1',
    slug: 'hackathons',
    title: 'Hackathons',
    description: 'Hackathon participations and achievements',
    semanticKind: 'HACKATHON',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'HACKATHON',
      fields: [
        {
          key: 'name',
          type: 'string',
          required: true,
          semanticRole: 'TITLE',
          meta: { label: 'Hackathon Name' },
        },
        {
          key: 'organizer',
          type: 'string',
          required: false,
          semanticRole: 'ORGANIZATION',
          meta: { label: 'Organizer' },
        },
        {
          key: 'date',
          type: 'date',
          required: true,
          semanticRole: 'EVENT_DATE',
          meta: { label: 'Date' },
        },
        {
          key: 'projectName',
          type: 'string',
          required: false,
          semanticRole: 'PROJECT_NAME',
          meta: { label: 'Project Name' },
        },
        {
          key: 'placement',
          type: 'string',
          required: false,
          semanticRole: 'ACHIEVEMENT',
          meta: { label: 'Placement / Award' },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea' },
        },
        {
          key: 'url',
          type: 'string',
          required: false,
          semanticRole: 'URL',
          meta: { label: 'Project URL', format: 'uri' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 11,
        sectionDetection: {
          keywords: ['hackathons', 'competitions'],
          multiWord: ['coding competitions', 'tech hackathons'],
        },
        scoring: {
          baseScore: 25,
          fieldWeights: { TITLE: 20, ACHIEVEMENT: 15, DESCRIPTION: 10 },
        },
      },
      export: {
        dsl: { sectionId: 'hackathons', astType: 'hackathons' },
        docx: {
          titleField: 'name',
          subtitleField: 'organizer',
          dateFields: ['date'],
          descriptionField: 'description',
        },
      },
    },
  },
  {
    key: 'open_source_v1',
    slug: 'open-source',
    title: 'Open Source',
    description: 'Open source contributions',
    semanticKind: 'OPEN_SOURCE',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'OPEN_SOURCE',
      fields: [
        {
          key: 'projectName',
          type: 'string',
          required: true,
          semanticRole: 'TITLE',
          meta: { label: 'Project Name' },
        },
        {
          key: 'role',
          type: 'enum',
          required: true,
          semanticRole: 'CONTRIBUTION_TYPE',
          enum: ['Maintainer', 'Contributor', 'Creator'],
          meta: { label: 'Role' },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea' },
        },
        {
          key: 'url',
          type: 'string',
          required: false,
          semanticRole: 'URL',
          meta: { label: 'Repository URL', format: 'uri' },
        },
        {
          key: 'startDate',
          type: 'date',
          required: false,
          semanticRole: 'START_DATE',
          meta: { label: 'Start Date' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 8,
        sectionDetection: {
          keywords: ['open-source', 'opensource', 'contributions'],
          multiWord: ['open source contributions', 'oss contributions'],
        },
        scoring: {
          baseScore: 30,
          fieldWeights: { TITLE: 25, CONTRIBUTION_TYPE: 15, DESCRIPTION: 10 },
        },
      },
      export: {
        dsl: { sectionId: 'open-source', astType: 'openSource' },
        docx: {
          titleField: 'projectName',
          subtitleField: 'role',
          descriptionField: 'description',
        },
      },
    },
  },
  {
    key: 'bug_bounty_v1',
    slug: 'bug-bounties',
    title: 'Bug Bounties',
    description: 'Security vulnerability discoveries',
    semanticKind: 'BUG_BOUNTY',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'BUG_BOUNTY',
      fields: [
        {
          key: 'platform',
          type: 'string',
          required: true,
          semanticRole: 'ORGANIZATION',
          meta: { label: 'Platform / Company' },
        },
        {
          key: 'severity',
          type: 'enum',
          required: false,
          semanticRole: 'SEVERITY',
          enum: ['Low', 'Medium', 'High', 'Critical'],
          meta: { label: 'Severity' },
        },
        {
          key: 'date',
          type: 'date',
          required: true,
          semanticRole: 'DISCOVERY_DATE',
          meta: { label: 'Discovery Date' },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea' },
        },
        {
          key: 'reward',
          type: 'string',
          required: false,
          semanticRole: 'REWARD',
          meta: { label: 'Reward' },
        },
        {
          key: 'url',
          type: 'string',
          required: false,
          semanticRole: 'URL',
          meta: { label: 'Reference URL', format: 'uri' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 12,
        sectionDetection: {
          keywords: ['bug-bounty', 'security', 'vulnerabilities'],
          multiWord: ['bug bounty', 'security research'],
        },
        scoring: {
          baseScore: 30,
          fieldWeights: { ORGANIZATION: 20, SEVERITY: 15, DESCRIPTION: 10 },
        },
      },
      export: {
        dsl: { sectionId: 'bug-bounties', astType: 'bugBounties' },
        docx: {
          titleField: 'platform',
          subtitleField: 'severity',
          dateFields: ['date'],
          descriptionField: 'description',
        },
      },
    },
  },
  {
    key: 'talk_v1',
    slug: 'talks',
    title: 'Talks & Presentations',
    description: 'Conference talks and presentations',
    semanticKind: 'TALK',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'TALK',
      fields: [
        {
          key: 'title',
          type: 'string',
          required: true,
          semanticRole: 'TITLE',
          meta: { label: 'Talk Title' },
        },
        {
          key: 'event',
          type: 'string',
          required: true,
          semanticRole: 'EVENT_NAME',
          meta: { label: 'Event / Conference' },
        },
        {
          key: 'date',
          type: 'date',
          required: true,
          semanticRole: 'EVENT_DATE',
          meta: { label: 'Date' },
        },
        {
          key: 'location',
          type: 'string',
          required: false,
          semanticRole: 'LOCATION',
          meta: { label: 'Location' },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea' },
        },
        {
          key: 'url',
          type: 'string',
          required: false,
          semanticRole: 'URL',
          meta: { label: 'Recording / Slides URL', format: 'uri' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 13,
        sectionDetection: {
          keywords: ['talks', 'presentations', 'speaking'],
          multiWord: ['conference talks', 'public speaking'],
        },
        scoring: {
          baseScore: 25,
          fieldWeights: { TITLE: 25, EVENT_NAME: 15, DESCRIPTION: 10 },
        },
      },
      export: {
        dsl: { sectionId: 'talks', astType: 'talks' },
        docx: {
          titleField: 'title',
          subtitleField: 'event',
          dateFields: ['date'],
          descriptionField: 'description',
        },
      },
    },
  },
  {
    key: 'achievement_v1',
    slug: 'achievements',
    title: 'Achievements',
    description: 'Notable achievements and accomplishments',
    semanticKind: 'ACHIEVEMENT',
    version: 1,
    isRepeatable: true,
    minItems: 0,
    definition: {
      schemaVersion: 1,
      kind: 'ACHIEVEMENT',
      fields: [
        {
          key: 'title',
          type: 'string',
          required: true,
          semanticRole: 'TITLE',
          meta: { label: 'Achievement Title' },
        },
        {
          key: 'date',
          type: 'date',
          required: false,
          semanticRole: 'ACHIEVEMENT_DATE',
          meta: { label: 'Date' },
        },
        {
          key: 'description',
          type: 'string',
          required: false,
          semanticRole: 'DESCRIPTION',
          meta: { label: 'Description', widget: 'textarea' },
        },
      ],
      ats: {
        isMandatory: false,
        recommendedPosition: 16,
        sectionDetection: {
          keywords: ['achievements', 'accomplishments'],
          multiWord: ['key achievements', 'notable accomplishments'],
        },
        scoring: {
          baseScore: 20,
          fieldWeights: { TITLE: 20, DESCRIPTION: 10 },
        },
      },
      export: {
        dsl: { sectionId: 'achievements', astType: 'achievements' },
        docx: {
          titleField: 'title',
          dateFields: ['date'],
          descriptionField: 'description',
        },
      },
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
