export interface VariantOverrides {
  /**
   * Maps "sectionItemId:fieldKey" to new text value.
   * e.g., { "clx123:title": "Senior Frontend Engineer" }
   */
  readonly textOverrides: Record<string, string>;

  /**
   * Maps sectionId or sectionItemId to visibility boolean.
   * e.g., { "section_skills": false, "item_clx789": false }
   */
  readonly visibilityOverrides: Record<string, boolean>;

  /**
   * Maps sectionId to new order number.
   * e.g., { "section_experience": 0, "section_skills": 1 }
   */
  readonly orderOverrides: Record<string, number>;
}

export interface ResumeVariantData {
  readonly id: string;
  readonly baseResumeId: string;
  readonly name: string;
  readonly overrides: VariantOverrides;
}
