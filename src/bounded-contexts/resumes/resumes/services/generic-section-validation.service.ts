import { BadRequestException, Injectable } from '@nestjs/common';
import { SectionTypeRepository } from '@/shared-kernel/repositories/section-type.repository';
import type {
  FieldValidationError,
  SectionItemValidationResult,
  SectionTypeWithDefinition,
  SectionValidationResult,
} from '@/shared-kernel/types/generic-section.types';
import { SectionDefinitionZodFactory } from './section-definition-zod.factory';

/**
 * Generic Section Validation Service
 *
 * Validates section content against SectionType definitions.
 * All validation rules are driven by the definition, not hardcoded.
 *
 * Features:
 * - Item-level validation against field definitions
 * - Section-level validation (min/max items)
 * - Full resume validation
 * - Detailed error reporting
 */
@Injectable()
export class GenericSectionValidationService {
  constructor(
    private readonly zodFactory: SectionDefinitionZodFactory,
    private readonly sectionTypeRepo: SectionTypeRepository,
  ) {}

  /**
   * Validate a single section item's content.
   */
  validateItem(
    sectionTypeKey: string,
    content: Record<string, unknown>,
  ): SectionItemValidationResult {
    const sectionType = this.getSectionType(sectionTypeKey);
    const schema = this.zodFactory.buildSchema(sectionType.definition);
    const result = schema.safeParse(content);

    if (result.success) {
      return { isValid: true, errors: [] };
    }

    const errors: FieldValidationError[] = result.error.issues.map((issue) => ({
      fieldKey: issue.path.join('.'),
      message: issue.message,
      code: this.mapZodCode(issue.code),
    }));

    return { isValid: false, errors };
  }

  /**
   * Validate a single section item and throw if invalid.
   */
  validateItemOrThrow(
    sectionTypeKey: string,
    content: Record<string, unknown>,
  ): Record<string, unknown> {
    const sectionType = this.getSectionType(sectionTypeKey);
    const schema = this.zodFactory.buildSchema(sectionType.definition);
    const result = schema.safeParse(content);

    if (!result.success) {
      throw new BadRequestException({
        message: `Invalid content for section type ${sectionTypeKey}`,
        errors: result.error.issues,
      });
    }

    return result.data;
  }

  /**
   * Validate a full section (all items + item count constraints).
   */
  validateSection(
    sectionTypeKey: string,
    sectionId: string,
    items: Array<{ id?: string; content: Record<string, unknown> }>,
  ): SectionValidationResult {
    const sectionType = this.getSectionType(sectionTypeKey);
    const sectionErrors: string[] = [];
    const itemResults: SectionItemValidationResult[] = [];

    // Validate item count constraints
    const itemCount = items.length;
    if (itemCount < sectionType.minItems) {
      sectionErrors.push(
        `Section requires at least ${sectionType.minItems} item(s), got ${itemCount}`,
      );
    }
    if (sectionType.maxItems !== null && itemCount > sectionType.maxItems) {
      sectionErrors.push(
        `Section allows at most ${sectionType.maxItems} item(s), got ${itemCount}`,
      );
    }

    // Validate each item
    for (const item of items) {
      const itemResult = this.validateItem(sectionTypeKey, item.content);
      itemResults.push({ ...itemResult, itemId: item.id });
    }

    const allItemsValid = itemResults.every((r) => r.isValid);
    const isValid = allItemsValid && sectionErrors.length === 0;

    return {
      isValid,
      sectionId,
      sectionTypeKey,
      itemResults,
      sectionErrors,
    };
  }

  /**
   * Validate all sections in a resume.
   */
  validateResumeSections(
    sections: Array<{
      id: string;
      sectionTypeKey: string;
      items: Array<{ id?: string; content: Record<string, unknown> }>;
    }>,
  ): {
    isValid: boolean;
    sectionResults: SectionValidationResult[];
    resumeErrors: string[];
  } {
    const sectionResults: SectionValidationResult[] = [];
    const resumeErrors: string[] = [];

    // Check for mandatory sections
    const mandatorySectionTypes = this.sectionTypeRepo.getMandatoryForAts();
    const presentKinds = new Set(
      sections.map((s) => {
        const st = this.sectionTypeRepo.getByKey(s.sectionTypeKey);
        return st?.semanticKind;
      }),
    );

    for (const mandatory of mandatorySectionTypes) {
      if (!presentKinds.has(mandatory.semanticKind)) {
        resumeErrors.push(
          `Missing mandatory section: ${mandatory.title} (${mandatory.semanticKind})`,
        );
      }
    }

    // Validate each section
    for (const section of sections) {
      const result = this.validateSection(section.sectionTypeKey, section.id, section.items);
      sectionResults.push(result);
    }

    const allSectionsValid = sectionResults.every((r) => r.isValid);
    const isValid = allSectionsValid && resumeErrors.length === 0;

    return { isValid, sectionResults, resumeErrors };
  }

  /**
   * Check if content matches the expected semantic roles for a section type.
   * Useful for ATS scoring preparation.
   */
  checkSemanticRoles(
    sectionTypeKey: string,
    content: Record<string, unknown>,
  ): {
    presentRoles: string[];
    missingRequiredRoles: string[];
  } {
    const sectionType = this.getSectionType(sectionTypeKey);
    const definition = sectionType.definition;

    const presentRoles: string[] = [];
    const missingRequiredRoles: string[] = [];

    for (const field of definition.fields) {
      if (!field.semanticRole) continue;

      const value = field.key ? content[field.key] : undefined;
      const hasValue = value !== undefined && value !== null && value !== '';

      if (hasValue) {
        presentRoles.push(field.semanticRole);
      } else if (field.required) {
        missingRequiredRoles.push(field.semanticRole);
      }
    }

    return { presentRoles, missingRequiredRoles };
  }

  private getSectionType(key: string): SectionTypeWithDefinition {
    const sectionType = this.sectionTypeRepo.getByKey(key);
    if (!sectionType) {
      throw new BadRequestException(`Unknown section type: ${key}`);
    }
    return sectionType;
  }

  private mapZodCode(
    code: string,
  ): 'REQUIRED' | 'TYPE_MISMATCH' | 'CONSTRAINT_VIOLATION' | 'INVALID_ENUM' {
    switch (code) {
      case 'invalid_type':
        return 'TYPE_MISMATCH';
      case 'invalid_enum_value':
        return 'INVALID_ENUM';
      case 'too_small':
      case 'too_big':
        return 'CONSTRAINT_VIOLATION';
      default:
        return 'REQUIRED';
    }
  }
}
