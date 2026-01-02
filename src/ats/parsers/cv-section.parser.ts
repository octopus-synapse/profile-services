import { Injectable } from '@nestjs/common';
import {
  CVSection,
  CVSectionType,
  ParsedCV,
  SectionValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from '../interfaces';

@Injectable()
export class CVSectionParser {
  private getSectionName(type: CVSectionType): string {
    return CVSectionType[type] as string;
  }

  private readonly SECTION_PATTERNS: Record<
    CVSectionType,
    { keywords: string[]; aliases: string[] }
  > = {
    [CVSectionType.PERSONAL_INFO]: {
      keywords: ['personal', 'contact', 'info', 'details'],
      aliases: [
        'personal information',
        'contact information',
        'contact details',
        'about me',
      ],
    },
    [CVSectionType.SUMMARY]: {
      keywords: ['summary', 'profile', 'objective', 'about'],
      aliases: [
        'professional summary',
        'career summary',
        'professional profile',
        'career objective',
        'objective',
      ],
    },
    [CVSectionType.EXPERIENCE]: {
      keywords: ['experience', 'employment', 'work', 'career', 'history'],
      aliases: [
        'work experience',
        'professional experience',
        'employment history',
        'work history',
        'career history',
        'experience profissional',
        'experiência',
      ],
    },
    [CVSectionType.EDUCATION]: {
      keywords: ['education', 'academic', 'qualification', 'degree'],
      aliases: [
        'educational background',
        'academic background',
        'qualifications',
        'degrees',
        'educação',
        'formação',
        'formação acadêmica',
      ],
    },
    [CVSectionType.SKILLS]: {
      keywords: ['skills', 'competencies', 'expertise', 'abilities'],
      aliases: [
        'technical skills',
        'core competencies',
        'key skills',
        'areas of expertise',
        'habilidades',
        'competências',
      ],
    },
    [CVSectionType.CERTIFICATIONS]: {
      keywords: ['certification', 'certificate', 'license'],
      aliases: [
        'certifications',
        'certificates',
        'professional certifications',
        'licenses',
        'certificações',
      ],
    },
    [CVSectionType.PROJECTS]: {
      keywords: ['project', 'portfolio'],
      aliases: ['projects', 'key projects', 'portfolio', 'projetos'],
    },
    [CVSectionType.AWARDS]: {
      keywords: ['award', 'achievement', 'honor', 'recognition'],
      aliases: ['awards', 'honors', 'achievements', 'recognitions', 'prêmios'],
    },
    [CVSectionType.PUBLICATIONS]: {
      keywords: ['publication', 'paper', 'research'],
      aliases: ['publications', 'research papers', 'publicações'],
    },
    [CVSectionType.LANGUAGES]: {
      keywords: ['language', 'idiom'],
      aliases: ['languages', 'language proficiency', 'idiomas'],
    },
    [CVSectionType.INTERESTS]: {
      keywords: ['interest', 'hobby', 'hobbies'],
      aliases: ['interests', 'hobbies', 'personal interests', 'interesses'],
    },
    [CVSectionType.REFERENCES]: {
      keywords: ['reference'],
      aliases: ['references', 'referências'],
    },
  };

  parseCV(text: string, fileName: string, fileType: string): ParsedCV {
    const lines = text.split('\n').map((line) => line.trim());
    const sections: CVSection[] = [];

    let currentSection: CVSection | null = null;
    let currentContent: string[] = [];

    lines.forEach((line, index) => {
      const detectedSection = this.detectSection(line);

      if (detectedSection) {
        // Save previous section if exists
        if (currentSection !== null && currentContent.length > 0) {
          const section: CVSection = {
            type: currentSection.type,
            title: currentSection.title,
            content: currentContent.join('\n').trim(),
            startLine: currentSection.startLine,
            endLine: index - 1,
            order: currentSection.order,
          };
          sections.push(section);
        }

        // Start new section
        currentSection = {
          type: detectedSection.type,
          title: line,
          content: '',
          startLine: index,
          order: sections.length,
        };
        currentContent = [];
      } else if (currentSection !== null) {
        // Add to current section
        if (line) {
          currentContent.push(line);
        }
      }
    });

    // Add last section
    const finalSection = currentSection as CVSection | null;
    if (finalSection && currentContent.length > 0) {
      sections.push({
        type: finalSection.type,
        title: finalSection.title,
        content: currentContent.join('\n').trim(),
        startLine: finalSection.startLine ?? 0,
        endLine: lines.length - 1,
        order: finalSection.order ?? 0,
      });
    }

    return {
      sections,
      rawText: text,
      metadata: {
        fileName,
        fileType,
        extractedAt: new Date(),
      },
    };
  }

  validateSections(parsedCV: ParsedCV): SectionValidationResult {
    const issues: ValidationIssue[] = [];
    const detectedSectionTypes = parsedCV.sections.map((s) => s.type);
    const detectedSections = Array.from(new Set(detectedSectionTypes)).map(
      (type) => this.getSectionName(type),
    );

    // Check for mandatory sections
    const mandatorySections = [
      CVSectionType.EXPERIENCE,
      CVSectionType.EDUCATION,
      CVSectionType.SKILLS,
    ];

    const missingSections = mandatorySections.filter(
      (section) => !detectedSectionTypes.includes(section),
    );

    if (missingSections.length > 0) {
      issues.push({
        code: 'MISSING_MANDATORY_SECTIONS',
        message: `Missing mandatory sections: ${missingSections.map((s) => this.getSectionName(s)).join(', ')}`,
        severity: ValidationSeverity.ERROR,
        suggestion:
          'Add these sections to improve ATS compatibility and provide complete information',
      });
    }

    // Check for empty sections
    parsedCV.sections.forEach((section) => {
      if (!section.content || section.content.length < 10) {
        issues.push({
          code: 'EMPTY_SECTION',
          message: `Section "${section.title}" is empty or too short`,
          severity: ValidationSeverity.WARNING,
          location: section.title,
          suggestion: 'Add meaningful content to this section',
        });
      }
    });

    // Check for duplicate sections
    const sectionCounts = new Map<CVSectionType, number>();
    detectedSectionTypes.forEach((type) => {
      sectionCounts.set(type, (sectionCounts.get(type) ?? 0) + 1);
    });

    sectionCounts.forEach((count, type) => {
      if (count > 1) {
        issues.push({
          code: 'DUPLICATE_SECTION',
          message: `Section "${this.getSectionName(type)}" appears ${count} times`,
          severity: ValidationSeverity.WARNING,
          suggestion: 'Combine duplicate sections into one',
        });
      }
    });

    // Check if any sections were detected at all
    if (parsedCV.sections.length === 0) {
      issues.push({
        code: 'NO_SECTIONS_DETECTED',
        message: 'Could not detect any CV sections',
        severity: ValidationSeverity.ERROR,
        suggestion:
          'Use clear section headers like "Experience", "Education", "Skills"',
      });
    }

    return {
      passed:
        issues.filter((i) => i.severity === ValidationSeverity.ERROR).length ===
        0,
      issues,
      detectedSections,
      missingSections: missingSections.map((s) => this.getSectionName(s)),
      metadata: {
        totalSections: parsedCV.sections.length,
        uniqueSections: detectedSections.length,
      },
    };
  }

  private detectSection(
    line: string,
  ): { type: CVSectionType; confidence: number } | null {
    const normalizedLine = line.toLowerCase().trim();

    // Skip very short lines or lines with too many words (likely not a header)
    if (normalizedLine.length < 3 || normalizedLine.split(/\s+/).length > 5) {
      return null;
    }

    let bestMatch: { type: CVSectionType; confidence: number } | null = null;

    Object.entries(this.SECTION_PATTERNS).forEach(([type, patterns]) => {
      const sectionType = type as CVSectionType;

      // Check exact alias matches first
      const exactMatch = patterns.aliases.some(
        (alias) => normalizedLine === alias.toLowerCase(),
      );

      if (exactMatch) {
        if (bestMatch === null) {
          bestMatch = { type: sectionType, confidence: 1.0 };
        } else if (bestMatch.confidence < 1.0) {
          bestMatch = { type: sectionType, confidence: 1.0 };
        }
        return;
      }

      // Check if line contains section keywords
      const keywordMatch = patterns.keywords.some((keyword) =>
        normalizedLine.includes(keyword.toLowerCase()),
      );

      if (keywordMatch) {
        const confidence = 0.8;
        if (bestMatch === null) {
          bestMatch = { type: sectionType, confidence };
        } else if (bestMatch.confidence < confidence) {
          bestMatch = { type: sectionType, confidence };
        }
      }
    });

    const finalMatch = bestMatch as {
      type: CVSectionType;
      confidence: number;
    } | null;
    if (!finalMatch) {
      return null;
    }

    if (finalMatch.confidence >= 0.8) {
      return finalMatch;
    }
    return null;
  }
}
