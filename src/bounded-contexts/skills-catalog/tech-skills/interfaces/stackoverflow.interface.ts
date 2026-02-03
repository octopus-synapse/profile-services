/**
 * Stack Overflow Types
 * Types for parsing Stack Overflow tags API
 */

export interface StackOverflowTag {
  name: string;
  count: number;
  has_synonyms: boolean;
  is_moderator_only: boolean;
  is_required: boolean;
}

export interface StackOverflowResponse {
  items: StackOverflowTag[];
  has_more: boolean;
  quota_max: number;
  quota_remaining: number;
}
