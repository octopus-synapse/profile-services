/**
 * Public projection of a section type entry exposed by the
 * `/v1/enums/section-types` endpoint. Only the three fields the
 * frontend consumes are surfaced.
 */

export interface SectionTypeView {
  readonly key: string;
  readonly semanticKind: string;
  readonly title: string;
}
