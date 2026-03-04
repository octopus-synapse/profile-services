/**
 * Resume Data Types for Analytics
 *
 * GENERIC SECTIONS - no type-specific knowledge.
 * Analytics services extract what they need from generic sections.
 */

/**
 * Generic section item for analytics.
 */
export interface AnalyticsSectionItem {
  readonly id: string;
  readonly content: Record<string, unknown>;
}

/**
 * Generic section for analytics.
 */
export interface AnalyticsSection {
  readonly id: string;
  readonly semanticKind: string;
  readonly items: readonly AnalyticsSectionItem[];
}

/**
 * Resume data for analytics operations.
 * NO type-specific fields (skills, experiences) - only generic sections.
 */
export interface ResumeForAnalytics {
  readonly summary?: string | null;
  readonly emailContact?: string | null;
  readonly phone?: string | null;
  readonly jobTitle?: string | null;
  readonly sections: readonly AnalyticsSection[];
}
