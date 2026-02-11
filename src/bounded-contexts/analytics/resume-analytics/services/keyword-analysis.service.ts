import { Injectable } from '@nestjs/common';
import type { ResumeForKeywords } from '../domain/types';
import { INDUSTRY_KEYWORDS } from '../domain/value-objects/industry-keywords';
import type {
  Industry,
  JobMatchResult,
  KeywordSuggestions,
  KeywordSuggestionsOptions,
} from '../interfaces';

@Injectable()
export class KeywordAnalysisService {
  getKeywordSuggestions(
    resume: ResumeForKeywords,
    options: KeywordSuggestionsOptions,
  ): KeywordSuggestions {
    const resumeText = this.extractResumeText(resume);
    const industryKeywords = INDUSTRY_KEYWORDS[options.industry];
    const existingKeywords = this.findExistingKeywords(resumeText, industryKeywords);
    const missingKeywords = industryKeywords.filter(
      (kw) => !existingKeywords.some((ek) => ek.keyword.toLowerCase() === kw.toLowerCase()),
    );
    const wordCount = resumeText.split(/\s+/).length;
    const keywordCount = existingKeywords.reduce((sum, kw) => sum + kw.count, 0);
    const keywordDensity = (keywordCount / wordCount) * 100;
    return {
      existingKeywords,
      missingKeywords,
      keywordDensity,
      warnings: this.detectWarnings(existingKeywords, keywordDensity),
      recommendations: this.generateRecommendations(missingKeywords, options.industry),
    };
  }

  matchJobDescription(resume: ResumeForKeywords, jobDescription: string): JobMatchResult {
    const resumeText = this.extractResumeText(resume).toLowerCase();
    const jobKeywords = this.extractJobKeywords(jobDescription);
    const matchedKeywords = jobKeywords.filter((kw) => resumeText.includes(kw.toLowerCase()));
    const missingKeywords = jobKeywords.filter((kw) => !resumeText.includes(kw.toLowerCase()));
    const matchScore =
      jobKeywords.length > 0 ? Math.round((matchedKeywords.length / jobKeywords.length) * 100) : 0;
    return {
      matchScore,
      matchedKeywords,
      missingKeywords,
      partialMatches: [],
      recommendations: this.generateMatchRecommendations(missingKeywords),
    };
  }

  private extractResumeText(resume: ResumeForKeywords): string {
    const parts: string[] = [];
    if (resume.summary) parts.push(resume.summary);
    if (resume.jobTitle) parts.push(resume.jobTitle);
    parts.push(...resume.skills.map((s) => s.name));
    for (const exp of resume.experiences) {
      if (exp.position) parts.push(exp.position);
      if (exp.company) parts.push(exp.company);
      if (exp.description) parts.push(exp.description);
    }
    return parts.join(' ');
  }

  private findExistingKeywords(text: string, industryKeywords: string[]) {
    const textLower = text.toLowerCase();
    return industryKeywords
      .map((keyword) => {
        const matches = textLower.match(new RegExp(keyword, 'gi'));
        return matches
          ? {
              keyword,
              count: matches.length,
              relevance: Math.min(matches.length * 20, 100),
            }
          : null;
      })
      .filter((r): r is { keyword: string; count: number; relevance: number } => r !== null)
      .sort((a, b) => b.count - a.count);
  }

  private extractJobKeywords(jobDescription: string): string[] {
    const allKeywords = Object.values(INDUSTRY_KEYWORDS).flat();
    const jobLower = jobDescription.toLowerCase();
    return allKeywords.filter((kw) => jobLower.includes(kw.toLowerCase()));
  }

  private detectWarnings(keywords: Array<{ keyword: string; count: number }>, density: number) {
    const stuffedKeywords = keywords.filter((k) => k.count > 5);
    if (stuffedKeywords.length === 0 && density <= 10) return [];
    return [
      {
        type: 'keyword_stuffing' as const,
        message: 'Some keywords appear too frequently',
        affectedKeywords: stuffedKeywords.map((k) => k.keyword),
      },
    ];
  }

  private generateRecommendations(missingKeywords: string[], industry: Industry): string[] {
    if (missingKeywords.length === 0) return [];
    return [
      `Consider adding these ${industry} keywords: ${missingKeywords.slice(0, 5).join(', ')}`,
      'Place keywords naturally in your summary and experience descriptions',
    ];
  }

  private generateMatchRecommendations(missingKeywords: string[]): string[] {
    if (missingKeywords.length === 0) return ['Great match!'];
    return [
      `Add these missing skills: ${missingKeywords.slice(0, 5).join(', ')}`,
      'Tailor your summary to match the job requirements',
    ];
  }
}
