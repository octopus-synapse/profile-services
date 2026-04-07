/**
 * Section Ordering Port
 *
 * Abstraction for ordering sections by recommended position.
 */

export abstract class SectionOrderingPort {
  abstract getRecommendedPosition(sectionTypeKey: string): number;
}
