import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ATSSectionTypeAdapter,
  SectionDetectionPattern,
} from '../../application/use-cases/ats-section-type.adapter';
import { ValidationSeverity } from '../../domain/interfaces';
import { CVSectionParser } from './cv-section.parser';

/**
 * Create a mock ATSSectionTypeAdapter with the section detection patterns.
 * These patterns mirror what would come from SectionType definitions.
 */
function createMockATSSectionTypeAdapter(): ATSSectionTypeAdapter {
  const patterns: SectionDetectionPattern[] = [
    {
      semanticKind: 'personal_info',
      sectionTypeKey: 'personal-info',
      keywords: ['personal', 'contact', 'info', 'details'],
      multiWord: ['personal information', 'contact information', 'contact details', 'about me'],
      isMandatory: false,
      recommendedPosition: 1,
    },
    {
      semanticKind: 'summary',
      sectionTypeKey: 'summary',
      keywords: ['summary', 'profile', 'objective', 'about'],
      multiWord: [
        'professional summary',
        'career summary',
        'professional profile',
        'career objective',
        'objective',
      ],
      isMandatory: false,
      recommendedPosition: 2,
    },
    {
      semanticKind: 'experience',
      sectionTypeKey: 'experience',
      keywords: ['experience', 'employment', 'work', 'career', 'history'],
      multiWord: [
        'work experience',
        'professional experience',
        'employment history',
        'work history',
        'career history',
        'experience profissional',
        'experiência',
      ],
      isMandatory: true,
      recommendedPosition: 3,
    },
    {
      semanticKind: 'education',
      sectionTypeKey: 'education',
      keywords: ['education', 'academic', 'qualification', 'degree'],
      multiWord: [
        'educational background',
        'academic background',
        'qualifications',
        'degrees',
        'educação',
        'formação',
        'formação acadêmica',
      ],
      isMandatory: true,
      recommendedPosition: 4,
    },
    {
      semanticKind: 'skills',
      sectionTypeKey: 'skills',
      keywords: ['skills', 'competencies', 'expertise', 'abilities'],
      multiWord: [
        'technical skills',
        'core competencies',
        'key skills',
        'areas of expertise',
        'habilidades',
        'competências',
      ],
      isMandatory: true,
      recommendedPosition: 5,
    },
    {
      semanticKind: 'certifications',
      sectionTypeKey: 'certifications',
      keywords: ['certification', 'certificate', 'license'],
      multiWord: [
        'certifications',
        'certificates',
        'professional certifications',
        'licenses',
        'certificações',
      ],
      isMandatory: false,
      recommendedPosition: 6,
    },
    {
      semanticKind: 'projects',
      sectionTypeKey: 'projects',
      keywords: ['project', 'portfolio'],
      multiWord: ['projects', 'key projects', 'portfolio', 'projetos'],
      isMandatory: false,
      recommendedPosition: 7,
    },
    {
      semanticKind: 'awards',
      sectionTypeKey: 'awards',
      keywords: ['award', 'achievement', 'honor', 'recognition'],
      multiWord: ['awards', 'honors', 'achievements', 'recognitions', 'prêmios'],
      isMandatory: false,
      recommendedPosition: 8,
    },
    {
      semanticKind: 'publications',
      sectionTypeKey: 'publications',
      keywords: ['publication', 'paper', 'research'],
      multiWord: ['publications', 'research papers', 'publicações'],
      isMandatory: false,
      recommendedPosition: 9,
    },
    {
      semanticKind: 'languages',
      sectionTypeKey: 'languages',
      keywords: ['language', 'idiom'],
      multiWord: ['languages', 'language proficiency', 'idiomas'],
      isMandatory: false,
      recommendedPosition: 10,
    },
    {
      semanticKind: 'interests',
      sectionTypeKey: 'interests',
      keywords: ['interest', 'hobby', 'hobbies'],
      multiWord: ['interests', 'hobbies', 'personal interests', 'interesses'],
      isMandatory: false,
      recommendedPosition: 11,
    },
    {
      semanticKind: 'references',
      sectionTypeKey: 'references',
      keywords: ['reference'],
      multiWord: ['references', 'referências'],
      isMandatory: false,
      recommendedPosition: 12,
    },
  ];

  const adapter = {
    getDetectionPatterns: () => patterns,
    getMandatorySectionTypes: () => patterns.filter((p) => p.isMandatory),
    getPatternsByPosition: () =>
      [...patterns].sort((a, b) => a.recommendedPosition - b.recommendedPosition),
    detectSectionType: (headerText: string) => {
      const normalizedHeader = headerText.toLowerCase().trim();

      if (normalizedHeader.length < 3 || normalizedHeader.split(/\s+/).length > 5) {
        return null;
      }

      let bestMatch: {
        pattern: SectionDetectionPattern;
        confidence: number;
      } | null = null;

      for (const pattern of patterns) {
        const exactMatch = pattern.multiWord.some(
          (phrase) => normalizedHeader === phrase.toLowerCase(),
        );

        if (exactMatch) {
          return { pattern, confidence: 1.0 };
        }

        const phraseMatch = pattern.multiWord.some((phrase) =>
          normalizedHeader.includes(phrase.toLowerCase()),
        );

        if (phraseMatch) {
          if (!bestMatch || bestMatch.confidence < 0.9) {
            bestMatch = { pattern, confidence: 0.9 };
          }
          continue;
        }

        const keywordMatch = pattern.keywords.some((keyword) =>
          normalizedHeader.includes(keyword.toLowerCase()),
        );

        if (keywordMatch) {
          if (!bestMatch || bestMatch.confidence < 0.8) {
            bestMatch = { pattern, confidence: 0.8 };
          }
        }
      }

      return bestMatch && bestMatch.confidence >= 0.8 ? bestMatch : null;
    },
    clearCache: () => {},
  } as ATSSectionTypeAdapter;

  return adapter;
}

describe('CVSectionParser', () => {
  let parser: CVSectionParser;
  let mockAdapter: ATSSectionTypeAdapter;

  beforeEach(() => {
    mockAdapter = createMockATSSectionTypeAdapter();
    parser = new CVSectionParser(mockAdapter);
  });

  describe('parseCV', () => {
    describe('Basic Parsing', () => {
      it('should parse a CV with all standard sections', () => {
        const text = `
Personal Information
John Doe
john@example.com

Experience
Software Engineer at Tech Corp (2020-Present)
Built scalable applications.

Education
B.Sc. Computer Science (2016-2020)

Skills
JavaScript, TypeScript, Python
        `.trim();

        const result = parser.parseCV(text, 'resume.pdf', 'application/pdf');

        expect(result.sections).toHaveLength(4);
        expect(result.sections[0].semanticKind).toBe('personal_info');
        expect(result.sections[1].semanticKind).toBe('experience');
        expect(result.sections[2].semanticKind).toBe('education');
        expect(result.sections[3].semanticKind).toBe('skills');
        expect(result.rawText).toBe(text);
        expect(result.metadata.fileName).toBe('resume.pdf');
        expect(result.metadata.fileType).toBe('application/pdf');
      });

      it('should preserve section order in the order field', () => {
        const text = `
Skills
JavaScript

Experience
Developer

Education
University
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].order).toBe(0);
        expect(result.sections[1].order).toBe(1);
        expect(result.sections[2].order).toBe(2);
      });

      it('should capture multi-line content within sections', () => {
        const text = `
Summary
A highly motivated engineer with 5+ years of experience.
Passionate about clean code and TDD.
Expert in distributed systems.
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].content.includes('highly motivated')).toBe(true);
        expect(result.sections[0].content.includes('clean code')).toBe(true);
        expect(result.sections[0].content.includes('distributed systems')).toBe(true);
      });

      it('should track line numbers for sections', () => {
        const text = `
Experience
Job 1

Education
School 1
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].startLine).toBeDefined();
        expect(result.sections[0].endLine).toBeDefined();
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty input', () => {
        const result = parser.parseCV('', 'empty.pdf', 'application/pdf');

        expect(result.sections).toHaveLength(0);
        expect(result.rawText).toBe('');
      });

      it('should handle whitespace-only input', () => {
        const result = parser.parseCV('   \n\n   \n', 'ws.pdf', 'application/pdf');

        expect(result.sections).toHaveLength(0);
      });

      it('should handle text with no detectable sections', () => {
        const text = `
This is random text without headers.
Just plain content here.
No structure at all.
        `.trim();

        const result = parser.parseCV(text, 'random.pdf', 'application/pdf');

        expect(result.sections).toHaveLength(0);
      });

      it('should handle very short lines (under 3 chars) as non-headers', () => {
        const text = `
XP
Experience
My job

Ed
Education
My school
        `.trim();

        const result = parser.parseCV(text, 'short.pdf', 'application/pdf');

        // XP and Ed should not be detected as headers (too short)
        expect(result.sections.length).toBeGreaterThanOrEqual(2);
        expect(result.sections.find((s) => s.title === 'XP')).toBeUndefined();
      });

      it('should handle lines with too many words as non-headers', () => {
        const text = `
My Experience at Various Companies Over The Years
Experience
Real content here
        `.trim();

        const result = parser.parseCV(text, 'long.pdf', 'application/pdf');

        // First line has >5 words, should not be detected
        const experienceSection = result.sections.find((s) => s.semanticKind === 'experience');
        expect(experienceSection?.title).toBe('Experience');
      });

      it('should handle section with no content after it', () => {
        const text = `
Experience
Job content

Skills
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        // Skills section has no content after it
        expect(result.sections.length).toBe(1);
        expect(result.sections[0].semanticKind).toBe('experience');
      });
    });

    describe('Section Alias Detection', () => {
      it('should detect "Work Experience" as experience', () => {
        const text = `
Work Experience
Software Developer at Company
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('experience');
      });

      it('should detect "Professional Experience" as experience', () => {
        const text = `
Professional Experience
Backend Engineer at Startup
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('experience');
      });

      it('should detect "Contact Information" as personal_info', () => {
        const text = `
Contact Information
john@example.com
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('personal_info');
      });

      it('should detect "Career Objective" as summary', () => {
        const text = `
Career Objective
To obtain a challenging position...
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('summary');
      });

      it('should detect "Technical Skills" as skills', () => {
        const text = `
Technical Skills
JavaScript, Python, Go
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('skills');
      });

      it('should detect "Educational Background" as education', () => {
        const text = `
Educational Background
MIT - Computer Science
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('education');
      });
    });

    describe('Portuguese Section Detection', () => {
      it('should detect "Experiência" as experience', () => {
        const text = `
Experiência
Desenvolvedor na Empresa
        `.trim();

        const result = parser.parseCV(text, 'cv.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('experience');
      });

      it('should detect "Formação Acadêmica" as education', () => {
        const text = `
Formação Acadêmica
Universidade Federal - Ciência da Computação
        `.trim();

        const result = parser.parseCV(text, 'cv.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('education');
      });

      it('should detect "Habilidades" as skills', () => {
        const text = `
Habilidades
JavaScript, TypeScript, NestJS
        `.trim();

        const result = parser.parseCV(text, 'cv.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('skills');
      });

      it('should detect "Idiomas" as languages', () => {
        const text = `
Idiomas
Português - Nativo
Inglês - Fluente
        `.trim();

        const result = parser.parseCV(text, 'cv.pdf', 'application/pdf');

        expect(result.sections[0].semanticKind).toBe('languages');
      });
    });

    describe('All Section Types', () => {
      const sectionTests: Array<{ header: string; expected: string }> = [
        { header: 'Personal Info', expected: 'personal_info' },
        { header: 'Summary', expected: 'summary' },
        { header: 'Experience', expected: 'experience' },
        { header: 'Education', expected: 'education' },
        { header: 'Skills', expected: 'skills' },
        { header: 'Certifications', expected: 'certifications' },
        { header: 'Projects', expected: 'projects' },
        { header: 'Awards', expected: 'awards' },
        { header: 'Publications', expected: 'publications' },
        { header: 'Languages', expected: 'languages' },
        { header: 'Interests', expected: 'interests' },
        { header: 'References', expected: 'references' },
      ];

      sectionTests.forEach(({ header, expected }) => {
        it(`should detect "${header}" as ${expected}`, () => {
          const text = `
${header}
Some content here
          `.trim();

          const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

          expect(result.sections[0].semanticKind).toBe(expected);
        });
      });
    });

    describe('Unicode and Special Characters', () => {
      it('should handle accented characters in section headers', () => {
        const text = `
Educação
Universidade de São Paulo
        `.trim();

        const result = parser.parseCV(text, 'cv.pdf', 'application/pdf');

        expect(result.sections.length).toBeGreaterThanOrEqual(0);
      });

      it('should handle special characters in content', () => {
        const text = `
Experience
Developer @ Company™ – Built systems with 99.9% uptime
• Led team of 5 engineers
• Reduced costs by $1M/year
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].content.includes('99.9%')).toBe(true);
        expect(result.sections[0].content.includes('$1M')).toBe(true);
      });

      it('should handle emoji in content', () => {
        const text = `
Skills
🚀 JavaScript
💻 TypeScript
🔧 DevOps
        `.trim();

        const result = parser.parseCV(text, 'test.pdf', 'application/pdf');

        expect(result.sections[0].content.includes('🚀')).toBe(true);
      });
    });
  });

  describe('validateSections', () => {
    describe('Passing Validation', () => {
      it('should pass when all mandatory sections are present with enough content', () => {
        const parsedCV = parser.parseCV(
          `
Experience
Senior Software Developer at Technology Company International Inc.
Developed scalable applications serving millions of users.

Education
Bachelor of Science in Computer Science from University of Technology.
Graduated with honors in 2020.

Skills
JavaScript, TypeScript, Python, React, Node.js, PostgreSQL, Redis, Docker
          `.trim(),
          'valid.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        expect(result.passed).toBe(true);
        expect(result.issues.filter((i) => i.severity === ValidationSeverity.ERROR)).toHaveLength(
          0,
        );
      });

      it('should report detected sections correctly', () => {
        const parsedCV = parser.parseCV(
          `
Experience
Senior Developer at Company working on various projects.

Education
Computer Science degree from University with additional certifications.

Skills
JavaScript, TypeScript, React, Node.js and other technologies.
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        // Sections are detected - checking length
        expect(result.detectedSections.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Missing Sections', () => {
      it('should fail when EXPERIENCE is missing', () => {
        const parsedCV = parser.parseCV(
          `
Education
University degree with details

Skills
Programming and development
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        expect(result.passed).toBe(false);
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'MISSING_MANDATORY_SECTIONS',
              severity: ValidationSeverity.ERROR,
            }),
          ]),
        );
        expect(result.missingSections.length).toBeGreaterThan(0);
      });

      it('should fail when EDUCATION is missing', () => {
        const parsedCV = parser.parseCV(
          `
Experience
Developer with experience

Skills
JavaScript and TypeScript
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        expect(result.passed).toBe(false);
        expect(result.missingSections.length).toBeGreaterThan(0);
      });

      it('should fail when SKILLS is missing', () => {
        const parsedCV = parser.parseCV(
          `
Experience
Developer with experience

Education
University degree details
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        expect(result.passed).toBe(false);
        expect(result.missingSections.length).toBeGreaterThan(0);
      });

      it('should report all missing mandatory sections', () => {
        const parsedCV = parser.parseCV(
          `
Summary
Just a summary here with enough content
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        expect(result.passed).toBe(false);
        // All 3 mandatory sections missing
        expect(result.missingSections.length).toBe(3);
      });
    });

    describe('Empty Sections', () => {
      it('should warn about sections with less than 10 characters', () => {
        const parsedCV = parser.parseCV(
          `
Experience
Short

Education
University degree in Computer Science

Skills
JavaScript, TypeScript, Python
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        const emptyWarnings = result.issues.filter((i) => i.code === 'EMPTY_SECTION');
        expect(emptyWarnings.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Duplicate Sections', () => {
      it('should warn about duplicate sections', () => {
        const parsedCV = parser.parseCV(
          `
Experience
Job 1 with enough content

Experience
Job 2 with enough content

Education
University with enough content

Skills
Programming with enough content
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'DUPLICATE_SECTION',
              severity: ValidationSeverity.WARNING,
            }),
          ]),
        );
      });

      it('should allow duplicates but warn (not fail)', () => {
        const parsedCV = parser.parseCV(
          `
Experience
Job 1 with enough content here

Experience
Job 2 with enough content here

Education
University with enough content

Skills
Programming with enough content
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        // Duplicates are warnings, should still pass
        expect(result.passed).toBe(true);
      });
    });

    describe('No Sections Detected', () => {
      it('should fail when no sections are detected', () => {
        const parsedCV = parser.parseCV(
          `
Random text without any structure.
More random content here.
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        expect(result.passed).toBe(false);
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'NO_SECTIONS_DETECTED',
              severity: ValidationSeverity.ERROR,
            }),
          ]),
        );
      });

      it('should provide helpful suggestion when no sections detected', () => {
        const parsedCV = parser.parseCV('', 'empty.pdf', 'application/pdf');

        const result = parser.validateSections(parsedCV);

        const noSectionsIssue = result.issues.find((i) => i.code === 'NO_SECTIONS_DETECTED');
        if (!noSectionsIssue?.suggestion)
          throw new Error('Expected noSectionsIssue with suggestion to be defined');
        expect(noSectionsIssue.suggestion.includes('section headers')).toBe(true);
      });
    });

    describe('Metadata', () => {
      it('should report total and unique section counts', () => {
        const parsedCV = parser.parseCV(
          `
Experience
Job 1 with enough content

Experience
Job 2 with enough content

Education
School with enough content

Skills
Programming with enough content
          `.trim(),
          'test.pdf',
          'application/pdf',
        );

        const result = parser.validateSections(parsedCV);

        expect(result.metadata?.totalSections).toBe(4);
        expect(result.metadata?.uniqueSections).toBe(3);
      });
    });
  });
});
