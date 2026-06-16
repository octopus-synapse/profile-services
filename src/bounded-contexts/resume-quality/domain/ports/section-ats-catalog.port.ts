/**
 * Section ATS Catalog Port — supplies the structural ATS rules the
 * completeness scorer needs for the mandatory-section and weighted-field
 * checks ported from the retired ATS score. Loaded from `SectionType`.
 */

export interface SectionAtsRule {
  readonly semanticKind: string;
  readonly isMandatory: boolean;
  /** Semantic role → weight; presence of these roles is what the
   * weighted-fields check inspects. */
  readonly fieldWeights: Readonly<Record<string, number>>;
  /** Semantic role → the item content key that carries it. */
  readonly roleToFieldKey: Readonly<Record<string, string>>;
}

export type SectionAtsCatalog = ReadonlyArray<SectionAtsRule>;

export abstract class SectionAtsCatalogPort {
  abstract loadCatalog(): Promise<SectionAtsCatalog>;
}
