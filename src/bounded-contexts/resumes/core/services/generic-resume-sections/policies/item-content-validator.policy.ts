import {
  InvalidEmploymentTypeForInternRoleException,
  SectionItemInvalidException,
} from '@/bounded-contexts/resumes/domain/exceptions';
import { SectionDefinitionZodFactory } from '../../section-definition-zod.factory';

interface DefinitionField {
  key?: string;
  semanticRole?: string;
}

export class ItemContentValidatorPolicy {
  constructor(private readonly sectionSchemaFactory: SectionDefinitionZodFactory) {}

  validate(definition: unknown, content: Record<string, unknown>) {
    const schema = this.sectionSchemaFactory.buildSchema(definition);
    const result = schema.safeParse(content);

    if (!result.success) {
      throw new SectionItemInvalidException('content is invalid for section type');
    }

    this.assertEmploymentSeniorityInvariant(definition, result.data as Record<string, unknown>);

    return result.data;
  }

  /**
   * Cross-field rule the per-field Zod schema can't express: a role with
   * seniority INTERN must have employmentType Internship. Keyed off the
   * definition's semantic roles (not field names) so it stays generic; only
   * runs when the section declares both roles (i.e. work experience).
   */
  private assertEmploymentSeniorityInvariant(
    definition: unknown,
    content: Record<string, unknown>,
  ): void {
    const fields = (definition as { fields?: DefinitionField[] } | null)?.fields;
    if (!Array.isArray(fields)) return;

    const seniorityKey = fields.find((f) => f.semanticRole === 'SENIORITY_LEVEL')?.key;
    const employmentKey = fields.find((f) => f.semanticRole === 'EMPLOYMENT_TYPE')?.key;
    if (!seniorityKey || !employmentKey) return;

    if (content[seniorityKey] !== 'INTERN') return;
    const employmentType = content[employmentKey];
    // Only an explicitly conflicting value is rejected — an empty/absent
    // employmentType is left for the app's auto-set, not blocked here.
    // Canonical JobType value (matches the seed enum: INTERNSHIP).
    if (
      typeof employmentType === 'string' &&
      employmentType.length > 0 &&
      employmentType !== 'INTERNSHIP'
    ) {
      throw new InvalidEmploymentTypeForInternRoleException(employmentType);
    }
  }
}
