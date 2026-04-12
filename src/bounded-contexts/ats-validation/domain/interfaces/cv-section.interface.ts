/**
 * Parsed CV section with dynamic semantic kind.
 * The `semanticKind` is loaded from SectionType definitions.
 */
export interface CVSection {
  /** Semantic kind from SectionType definitions (e.g., 'experience', 'education') */
  semanticKind: string;
  /** Original title as detected in the CV */
  title: string;
  /** Section content text */
  content: string;
  /** Start line in source document */
  startLine?: number;
  /** End line in source document */
  endLine?: number;
  /** Order of section in document */
  order?: number;
  /** Detection confidence (0.0-1.0) */
  confidence?: number;
}

export interface ParsedCV {
  sections: CVSection[];
  rawText: string;
  metadata: {
    fileName: string;
    fileType: string;
    extractedAt: Date;
  };
}
