/**
 * ATS Validator Constants
 *
 * Named constants for magic numbers used in ATS validation logic.
 * Each constant includes a comment explaining WHY that specific value is used.
 */

// Format Validator Constants
export const FORMAT_VALIDATION = {
  /**
   * Maximum special characters allowed before warning
   * Rationale: ATS parsers struggle with >50 special formatting characters
   */
  MAX_SPECIAL_CHAR_COUNT: 50,

  /**
   * Minimum pipe characters to detect table
   * Rationale: 3+ lines with pipes likely indicate table structure
   */
  TABLE_PIPE_THRESHOLD: 3,

  /**
   * Minimum tab characters to detect table
   * Rationale: 5+ lines with tabs likely indicate tabular data
   */
  TABLE_TAB_THRESHOLD: 5,

  /**
   * Minimum consecutive spaces to detect multi-column layout
   * Rationale: 10+ spaces typically indicate column separation
   */
  MULTI_COLUMN_SPACING: 10,

  /**
   * Minimum suspicious lines to confirm multi-column layout
   * Rationale: 5+ lines with excessive spacing confirms column layout
   */
  MULTI_COLUMN_LINE_THRESHOLD: 5,
} as const;

// Layout Safety Validator Constants
export const LAYOUT_VALIDATION = {
  /**
   * Minimum consecutive spaces to detect column separator
   * Rationale: 10+ spaces typically separate columns in multi-column layouts
   */
  COLUMN_SEPARATOR_SPACING: 10,

  /**
   * Percentage threshold for multi-column detection
   * Rationale: If >20% of lines have column separators, likely multi-column
   */
  MULTI_COLUMN_PERCENTAGE: 0.2,

  /**
   * Minimum consecutive newlines to detect excessive breaks
   * Rationale: 3+ consecutive newlines indicate excessive whitespace
   */
  EXCESSIVE_NEWLINES: 3,

  /**
   * Minimum repeating characters for horizontal line detection
   * Rationale: 5+ dashes/equals typically form visual separator lines
   */
  HORIZONTAL_LINE_MIN_LENGTH: 5,

  /**
   * Minimum repeating Unicode characters for horizontal line detection
   * Rationale: 3+ Unicode box-drawing chars typically form separator lines
   */
  HORIZONTAL_LINE_UNICODE_MIN: 3,
} as const;
