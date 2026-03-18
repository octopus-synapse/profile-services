/**
 * Onboarding Steps Configuration
 *
 * Single source of truth for onboarding flow steps.
 * Session/Commands API — backend drives the entire flow.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SectionDefinition } from '@/shared-kernel/dtos/semantic-sections.dto';

/** Step identifier types */
export type StaticStep =
  | 'welcome'
  | 'personal-info'
  | 'username'
  | 'professional-profile'
  | 'template'
  | 'review'
  | 'complete';

export type SectionStep = `section:${string}`;
export type OnboardingStepId = StaticStep | SectionStep;

/** Field descriptor for a step — drives frontend form rendering */
export class StepFieldDto {
  @ApiProperty({ example: 'company', description: 'Field key' })
  key!: string;

  @ApiProperty({ example: 'text', description: 'UI input type' })
  type!: string;

  @ApiProperty({ example: 'Company', description: 'Display label' })
  label!: string;

  @ApiProperty({ example: true, description: 'Whether the field is required' })
  required!: boolean;

  @ApiPropertyOptional({
    example: ['beginner', 'intermediate', 'advanced'],
    description: 'Options for select fields',
  })
  options?: string[];

  @ApiPropertyOptional({
    example: 'textarea',
    description: 'Widget hint (textarea, text)',
  })
  widget?: string;
}

/** Step metadata for SDK — includes everything the frontend needs to render */
export class StepMetaDto {
  @ApiProperty({
    example: 'personal-info',
    description: 'Unique step identifier',
  })
  id!: string;

  @ApiProperty({ example: 'user', description: 'Short label for UI' })
  label!: string;

  @ApiProperty({
    example: 'Personal Information',
    description: 'Human-readable description',
  })
  description!: string;

  @ApiProperty({
    example: true,
    description: 'Whether this step must be completed',
  })
  required!: boolean;

  @ApiProperty({
    example: 'personal-info',
    description: 'Component type hint for frontend rendering',
  })
  component!: string;

  @ApiPropertyOptional({
    example: '💼',
    description: 'Icon emoji or identifier',
  })
  icon?: string;

  @ApiPropertyOptional({
    type: [StepFieldDto],
    description: 'Field definitions for form rendering (section steps)',
  })
  fields?: StepFieldDto[];

  @ApiPropertyOptional({
    example: "I don't have experience to add",
    description: 'Label for the "no data" checkbox (section steps)',
  })
  noDataLabel?: string;

  @ApiPropertyOptional({
    example: 'Add your work experience...',
    description: 'Placeholder / helper text',
  })
  placeholder?: string;

  @ApiPropertyOptional({
    example: 'Add Experience',
    description: 'Label for the add-item button (section steps)',
  })
  addLabel?: string;
}

/** Map SectionDefinition fields → StepFieldDto[] */
function mapDefinitionToFields(definition: SectionDefinition): StepFieldDto[] {
  return definition.fields
    .filter((f) => f.key && f.type !== 'array' && f.type !== 'object')
    .map((f) => {
      const meta = (f.meta ?? {}) as Record<string, unknown>;
      let uiType: string;
      if (f.type === 'enum') uiType = 'select';
      else if (f.type === 'date') uiType = 'date';
      else if (f.type === 'number') uiType = 'number';
      else if (f.type === 'boolean') uiType = 'checkbox';
      else
        uiType =
          typeof meta.widget === 'string' && meta.widget === 'textarea' ? 'textarea' : 'text';

      return {
        key: f.key!,
        type: uiType,
        label: typeof meta.label === 'string' ? meta.label : f.key!,
        required: f.required ?? false,
        options: f.enum,
        widget: typeof meta.widget === 'string' ? meta.widget : undefined,
      };
    });
}

/** Static steps (always present) */
const STATIC_STEPS_BEFORE_SECTIONS: StepMetaDto[] = [
  {
    id: 'welcome',
    label: 'init',
    description: 'Welcome to ProFile',
    required: true,
    component: 'welcome',
    icon: '🚀',
  },
  {
    id: 'personal-info',
    label: 'user',
    description: 'Personal Information',
    required: true,
    component: 'personal-info',
    icon: '👤',
  },
  {
    id: 'username',
    label: '@',
    description: 'Choose Your Username',
    required: true,
    component: 'username',
    icon: '@',
  },
  {
    id: 'professional-profile',
    label: 'profile',
    description: 'Professional Profile',
    required: true,
    component: 'professional-profile',
    icon: '💼',
  },
];

const STATIC_STEPS_AFTER_SECTIONS: StepMetaDto[] = [
  {
    id: 'template',
    label: 'theme',
    description: 'Choose Your Theme',
    required: true,
    component: 'template',
    icon: '🎨',
  },
  {
    id: 'review',
    label: 'review',
    description: 'Review & Submit',
    required: true,
    component: 'review',
    icon: '✓',
  },
  {
    id: 'complete',
    label: 'done',
    description: 'Setup Complete',
    required: true,
    component: 'complete',
    icon: '🎉',
  },
];

/** Section type data from database — includes resolved translations */
export interface SectionTypeData {
  key: string;
  title: string;
  description: string;
  definition: unknown;
  icon: string;
  iconType: string;
  // Resolved translations (already for current locale)
  label: string;
  noDataLabel: string;
  placeholder: string;
  addLabel: string;
}

/** Section step order — which sections to show in onboarding */
const SECTION_ORDER_KEYS = [
  'work_experience_v1',
  'education_v1',
  'skill_set_v1',
  'language_v1',
] as const;

/** Default labels for fallback when DB data not available */
const DEFAULT_SECTION_LABELS: Record<
  string,
  {
    label: string;
    required: boolean;
    icon: string;
    noDataLabel: string;
    placeholder: string;
    addLabel: string;
  }
> = {
  work_experience_v1: {
    label: 'work',
    required: false,
    icon: '💼',
    noDataLabel: "I don't have work experience to add",
    placeholder: 'Add your work experience...',
    addLabel: 'Add Experience',
  },
  education_v1: {
    label: 'edu',
    required: false,
    icon: '🎓',
    noDataLabel: "I don't have education to add",
    placeholder: 'Add your education...',
    addLabel: 'Add Education',
  },
  skill_set_v1: {
    label: 'skills',
    required: true,
    icon: '⚡',
    noDataLabel: "I'm still developing my skills",
    placeholder: 'Add your skills...',
    addLabel: 'Add Skill',
  },
  language_v1: {
    label: 'lang',
    required: false,
    icon: '🌍',
    noDataLabel: "I don't have languages to add",
    placeholder: 'Add languages you speak...',
    addLabel: 'Add Language',
  },
};

/**
 * Build all onboarding steps with field definitions from DB
 * Now uses resolved translations from SectionTypeData
 */
export function buildOnboardingSteps(sectionTypeData?: SectionTypeData[]): StepMetaDto[] {
  const sectionMap = new Map((sectionTypeData ?? []).map((st) => [st.key, st]));

  const sectionSteps: StepMetaDto[] = SECTION_ORDER_KEYS.map((key) => {
    const dbData = sectionMap.get(key);
    const fallback = DEFAULT_SECTION_LABELS[key];

    // Use DB translations if available, fallback to hardcoded defaults
    const label = dbData?.label || fallback?.label || key;
    const icon = dbData?.icon || fallback?.icon || '📄';
    const noDataLabel = dbData?.noDataLabel || fallback?.noDataLabel || "I don't have items to add";
    const placeholder = dbData?.placeholder || fallback?.placeholder || 'Add items...';
    const addLabel = dbData?.addLabel || fallback?.addLabel || 'Add Item';
    const title = dbData?.title || key.replace(/_/g, ' ').replace('v1', '').trim();
    const required = fallback?.required ?? false;

    // Parse definition to get field descriptors
    let fields: StepFieldDto[] | undefined;
    if (dbData?.definition) {
      try {
        const def = dbData.definition as SectionDefinition;
        if (def.fields && Array.isArray(def.fields)) {
          fields = mapDefinitionToFields(def);
        }
      } catch {
        // Fallback: no fields if definition is invalid
      }
    }

    return {
      id: `section:${key}`,
      label,
      description: title,
      required,
      component: 'generic-section',
      icon,
      fields,
      noDataLabel,
      placeholder,
      addLabel,
    };
  });

  return [...STATIC_STEPS_BEFORE_SECTIONS, ...sectionSteps, ...STATIC_STEPS_AFTER_SECTIONS];
}

/**
 * Check if a step ID is a section step
 */
export function isSectionStep(stepId: string): stepId is SectionStep {
  return stepId.startsWith('section:');
}

/**
 * Extract section type key from section step ID
 */
export function getSectionTypeFromStep(stepId: SectionStep): string {
  return stepId.replace('section:', '');
}

/**
 * Get step index in the flow
 */
export function getStepIndex(stepId: string, steps: StepMetaDto[]): number {
  return steps.findIndex((s) => s.id === stepId);
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(currentStepIndex: number, totalSteps: number): number {
  if (totalSteps <= 1) return 0;
  return Math.round((currentStepIndex / (totalSteps - 1)) * 100);
}
