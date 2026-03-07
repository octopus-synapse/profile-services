import type { ATSIssue } from '../../interfaces';

/**
 * Generates actionable recommendations from generic ATS issues.
 * No hardcoded section types — maps generic issue codes to guidance.
 */
export function generateRecommendations(issues: ATSIssue[]): string[] {
  return issues.map((issue) => {
    switch (issue.code) {
      case 'MISSING_CONTACT_INFO':
        return 'Add your email and phone number';
      case 'SHORT_SUMMARY':
        return 'Write a compelling 2-3 sentence professional summary';
      case 'MISSING_MANDATORY_SECTION':
        return `Add the required section: ${issue.context?.sectionKind ?? 'unknown'}`;
      case 'MISSING_WEIGHTED_FIELDS':
        return `Complete fields in ${issue.context?.sectionKind ?? 'section'}: ${issue.context?.missingFields?.join(', ') ?? 'check required fields'}`;
      default:
        return issue.message;
    }
  });
}
