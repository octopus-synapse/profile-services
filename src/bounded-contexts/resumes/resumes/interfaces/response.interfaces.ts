/**
 * Resume Response Interfaces
 *
 * Response types for resume entities.
 * These are NOT validation schemas - just TypeScript interfaces for API responses.
 *
 * Following Clean Code: Response types reflect database entities, not input validation.
 */

/**
 * Base response fields shared by all resume sub-resources
 */
interface Base {
  id: string;
  resumeId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Experience Response
 */
export interface Experience extends Base {
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  location?: string;
  description?: string;
  skills: string[];
}

/**
 * Education Response
 */
export interface Education extends Base {
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  location?: string;
  description?: string;
  gpa?: string;
}

/**
 * Skill Response
 */
export interface Skill extends Base {
  name: string;
  category: string;
  level?: number;
}

/**
 * Language Response
 */
export interface Language extends Base {
  name: string;
  level: string;
  cefrLevel?: string | null;
}

/**
 * Certification Response
 */
export interface Certification extends Base {
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
}

/**
 * Project Response
 */
export interface Project extends Base {
  name: string;
  description?: string;
  url?: string;
  startDate?: Date;
  endDate?: Date;
  isCurrent: boolean;
  technologies: string[];
}

/**
 * Publication Response
 */
export interface Publication extends Base {
  title: string;
  publisher: string;
  publicationType: string;
  url?: string;
  publishedAt: Date;
  abstract?: string;
  coAuthors: string[];
  citationCount?: number;
}

/**
 * Recommendation Response
 */
export interface Recommendation extends Base {
  author: string;
  position?: string;
  company?: string;
  content: string;
  date?: Date;
}

/**
 * Hackathon Response
 */
export interface Hackathon extends Base {
  name: string;
  organizer: string;
  position?: string;
  projectName: string;
  description?: string;
  technologies: string[];
  teamSize?: number;
  date: Date;
  projectUrl?: string;
  award?: string;
}

/**
 * Bug Bounty Response
 */
export interface BugBounty extends Base {
  platform: string;
  company: string;
  severity: string;
  vulnerabilityType: string;
  cveId?: string;
  reward?: number;
  description?: string;
  reportedAt: Date;
  fixedAt?: Date;
  reportUrl?: string;
}

/**
 * Open Source Response
 */
export interface OpenSource extends Base {
  projectName: string;
  projectUrl: string;
  role: string;
  description?: string;
  technologies: string[];
  contributions?: number;
  stars?: number;
  isCurrent: boolean;
  startDate: Date;
  endDate?: Date;
}

/**
 * Talk Response
 */
export interface Talk extends Base {
  title: string;
  event: string;
  eventType: string;
  location?: string;
  date: Date;
  description?: string;
  slidesUrl?: string;
  recordingUrl?: string;
  attendees?: number;
}

/**
 * Award Response
 */
export interface Award extends Base {
  title: string;
  issuer: string;
  date: Date;
  description?: string;
  url?: string;
}

/**
 * Interest Response
 */
export interface Interest extends Base {
  name: string;
  description?: string;
}

/**
 * Achievement Response
 */
export interface Achievement extends Base {
  type: string;
  title: string;
  description?: string;
  badgeUrl?: string;
  verificationUrl?: string;
  achievedAt: Date;
  value?: number;
  rank?: string;
}

/**
 * Paginated Result
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
