/**
 * Onboarding Steps Configuration
 *
 * Single source of truth for onboarding flow steps.
 * Session/Commands API — backend drives the entire flow.
 */

import type { SectionDefinition } from '@/shared-kernel/schemas/sections';

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
export interface StepField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  widget?: string;
}

/** Step metadata — includes everything the frontend needs to render */
export interface StepMeta {
  id: string;
  label: string;
  description: string;
  required: boolean;
  component: string;
  icon?: string;
  fields?: StepField[];
  noDataLabel?: string;
  placeholder?: string;
  addLabel?: string;
  data?: Record<string, unknown>[];
}

/** Map SectionDefinition fields → StepField[] */
function mapDefinitionToFields(definition: SectionDefinition): StepField[] {
  return definition.fields
    .filter((f) => f.key && f.type !== 'array' && f.type !== 'object')
    .map((f) => {
      const fieldKey = f.key;
      if (!fieldKey) {
        throw new Error('Section definition field key is required');
      }

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
        key: fieldKey,
        type: uiType,
        label: typeof meta.label === 'string' ? meta.label : fieldKey,
        required: f.required ?? false,
        options: f.enum,
        widget: typeof meta.widget === 'string' ? meta.widget : undefined,
      };
    });
}

/** Translations for static steps */
type StepTranslation = { label: string; description: string; fields?: Record<string, string> };

const STATIC_STEP_TRANSLATIONS: Record<string, Record<string, StepTranslation>> = {
  welcome: {
    en: { label: 'Welcome', description: 'Welcome to ProFile' },
    'pt-BR': { label: 'Início', description: 'Bem-vindo ao ProFile' },
    es: { label: 'Inicio', description: 'Bienvenido a ProFile' },
  },
  'personal-info': {
    en: {
      label: 'Personal Info',
      description: 'Personal Information',
      fields: { fullName: 'Full Name', email: 'Email', phone: 'Phone', location: 'Location' },
    },
    'pt-BR': {
      label: 'Dados Pessoais',
      description: 'Informações Pessoais',
      fields: {
        fullName: 'Nome Completo',
        email: 'E-mail',
        phone: 'Telefone',
        location: 'Localização',
      },
    },
    es: {
      label: 'Datos Personales',
      description: 'Información Personal',
      fields: {
        fullName: 'Nombre Completo',
        email: 'Correo',
        phone: 'Teléfono',
        location: 'Ubicación',
      },
    },
  },
  username: {
    en: {
      label: 'Username',
      description: 'Choose Your Username',
      fields: { username: 'Username' },
    },
    'pt-BR': {
      label: 'Usuário',
      description: 'Escolha seu Usuário',
      fields: { username: 'Nome de Usuário' },
    },
    es: {
      label: 'Usuario',
      description: 'Elige tu Usuario',
      fields: { username: 'Nombre de Usuario' },
    },
  },
  'professional-profile': {
    en: {
      label: 'Profile',
      description: 'Professional Profile',
      fields: {
        jobTitle: 'Job Title',
        summary: 'Summary',
        linkedin: 'LinkedIn',
        github: 'GitHub',
        website: 'Website',
      },
    },
    'pt-BR': {
      label: 'Perfil',
      description: 'Perfil Profissional',
      fields: {
        jobTitle: 'Cargo',
        summary: 'Resumo',
        linkedin: 'LinkedIn',
        github: 'GitHub',
        website: 'Website',
      },
    },
    es: {
      label: 'Perfil',
      description: 'Perfil Profesional',
      fields: {
        jobTitle: 'Puesto',
        summary: 'Resumen',
        linkedin: 'LinkedIn',
        github: 'GitHub',
        website: 'Sitio Web',
      },
    },
  },
  template: {
    en: {
      label: 'Theme',
      description: 'Choose Your Theme',
      fields: { templateId: 'Template', colorScheme: 'Color Scheme' },
    },
    'pt-BR': {
      label: 'Tema',
      description: 'Escolha seu Tema',
      fields: { templateId: 'Modelo', colorScheme: 'Esquema de Cores' },
    },
    es: {
      label: 'Tema',
      description: 'Elige tu Tema',
      fields: { templateId: 'Plantilla', colorScheme: 'Esquema de Colores' },
    },
  },
  review: {
    en: { label: 'Review', description: 'Review & Submit' },
    'pt-BR': { label: 'Revisão', description: 'Revisar e Enviar' },
    es: { label: 'Revisión', description: 'Revisar y Enviar' },
  },
  complete: {
    en: { label: 'Done', description: 'Setup Complete' },
    'pt-BR': { label: 'Pronto', description: 'Configuração Completa' },
    es: { label: 'Listo', description: 'Configuración Completa' },
  },
};

function resolveStaticStep(id: string, locale: string): StepTranslation {
  const translations = STATIC_STEP_TRANSLATIONS[id];
  return translations?.[locale] ?? translations?.en ?? { label: id, description: id };
}

/** Static step base definitions (without translations) */
interface StaticStepBase {
  id: string;
  required: boolean;
  component: string;
  icon: string;
  fields?: Omit<StepField, 'label'>[];
}

const STATIC_STEPS_BEFORE: StaticStepBase[] = [
  { id: 'welcome', required: true, component: 'welcome', icon: '🚀' },
  {
    id: 'personal-info',
    required: true,
    component: 'personal-info',
    icon: '👤',
    fields: [
      { key: 'fullName', type: 'text', required: true },
      { key: 'email', type: 'email', required: true },
      { key: 'phone', type: 'text', required: false },
      { key: 'location', type: 'text', required: false },
    ],
  },
  {
    id: 'username',
    required: true,
    component: 'username',
    icon: '@',
    fields: [{ key: 'username', type: 'text', required: true }],
  },
  {
    id: 'professional-profile',
    required: true,
    component: 'professional-profile',
    icon: '💼',
    fields: [
      { key: 'jobTitle', type: 'text', required: true },
      { key: 'summary', type: 'textarea', required: false, widget: 'textarea' },
      { key: 'linkedin', type: 'url', required: false },
      { key: 'github', type: 'url', required: false },
      { key: 'website', type: 'url', required: false },
    ],
  },
];

const STATIC_STEPS_AFTER: StaticStepBase[] = [
  {
    id: 'template',
    required: true,
    component: 'template',
    icon: '🎨',
    fields: [
      { key: 'templateId', type: 'text', required: false },
      { key: 'colorScheme', type: 'text', required: true },
    ],
  },
  { id: 'review', required: true, component: 'review', icon: '✓' },
  { id: 'complete', required: true, component: 'complete', icon: '🎉' },
];

function buildStaticSteps(bases: StaticStepBase[], locale: string): StepMeta[] {
  return bases.map((base) => {
    const t = resolveStaticStep(base.id, locale);
    const fields = base.fields?.map((f) => ({
      ...f,
      label: t.fields?.[f.key] ?? f.key,
    }));
    return {
      id: base.id,
      label: t.label,
      description: t.description,
      required: base.required,
      component: base.component,
      icon: base.icon,
      ...(fields ? { fields } : {}),
    };
  });
}

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
    label: 'Work Experience',
    required: false,
    icon: '💼',
    noDataLabel: "I don't have work experience to add",
    placeholder: 'Add your work experience...',
    addLabel: 'Add Experience',
  },
  education_v1: {
    label: 'Education',
    required: false,
    icon: '🎓',
    noDataLabel: "I don't have education to add",
    placeholder: 'Add your education...',
    addLabel: 'Add Education',
  },
  skill_set_v1: {
    label: 'Skills',
    required: true,
    icon: '⚡',
    noDataLabel: "I'm still developing my skills",
    placeholder: 'Add your skills...',
    addLabel: 'Add Skill',
  },
  language_v1: {
    label: 'Languages',
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
/** Minimal theme data for the template step */
export interface OnboardingThemeOption {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  atsScore: number | null;
  thumbnailUrl: string | null;
}

export function buildOnboardingSteps(
  sectionTypeData?: SectionTypeData[],
  locale = 'en',
  systemThemes?: OnboardingThemeOption[],
): StepMeta[] {
  const sectionMap = new Map((sectionTypeData ?? []).map((st) => [st.key, st]));

  const sectionSteps: StepMeta[] = SECTION_ORDER_KEYS.map((key) => {
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
    let fields: StepField[] | undefined;
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

  const afterSteps = buildStaticSteps(STATIC_STEPS_AFTER, locale);

  // Inject system themes as data into the template step
  if (systemThemes?.length) {
    const templateStep = afterSteps.find((s) => s.id === 'template');
    if (templateStep) {
      templateStep.data = systemThemes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        atsScore: t.atsScore,
        thumbnailUrl: t.thumbnailUrl,
      }));
    }
  }

  return [...buildStaticSteps(STATIC_STEPS_BEFORE, locale), ...sectionSteps, ...afterSteps];
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
export function getStepIndex(stepId: string, steps: StepMeta[]): number {
  return steps.findIndex((s) => s.id === stepId);
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(currentStepIndex: number, totalSteps: number): number {
  if (totalSteps <= 1) return 0;
  return Math.round((currentStepIndex / (totalSteps - 1)) * 100);
}
