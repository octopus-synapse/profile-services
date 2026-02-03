import type { ATSIssue, ATSIssueType } from '../../interfaces';

const RECOMMENDATION_MAP: Record<ATSIssueType, string> = {
  missing_contact: 'Add your email and phone number',
  short_summary: 'Write a compelling 2-3 sentence professional summary',
  missing_skills: 'Add 5-10 relevant technical and soft skills',
  no_experience: 'Add your work experience with detailed descriptions',
  missing_education: 'Add your education history',
  weak_action_verbs: 'Start bullet points with action verbs',
  no_quantified_achievements: 'Include metrics and numbers',
  keyword_stuffing: 'Reduce keyword repetition',
  format_issue: 'Improve document formatting',
};

export function generateATSRecommendations(issues: ATSIssue[]): string[] {
  return issues.map((issue) => RECOMMENDATION_MAP[issue.type] || issue.message);
}
