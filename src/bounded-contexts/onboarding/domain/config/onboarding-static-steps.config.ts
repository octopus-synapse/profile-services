import { renderStaticStep as resolveStaticStep } from '@packages/i18n';
import type { StaticStepBase, StepMeta } from './onboarding-steps.types';

export const STATIC_STEPS_BEFORE: StaticStepBase[] = [
  {
    id: 'welcome',
    required: true,
    component: 'welcome',
    icon: '🚀',
    data: {
      features: [
        { icon: '📄', title: 'ATS-Optimized Resume', description: 'Score 90+ guaranteed' },
        { icon: '🎨', title: 'Professional Templates', description: 'Clean design that impresses' },
        { icon: '⚡', title: 'Ready in Minutes', description: 'Guided step-by-step' },
        { icon: '🌐', title: 'Public Profile', description: 'Share with recruiters' },
      ],
      estimatedMinutes: 5,
    },
  },
  {
    id: 'personal-info',
    required: true,
    component: 'personal-info',
    icon: '👤',
    fields: [
      { key: 'fullName', type: 'text', required: true },
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
      { key: 'headline', type: 'text', required: false },
      { key: 'summary', type: 'textarea', required: false, widget: 'textarea' },
      { key: 'linkedin', type: 'url', required: false },
      { key: 'github', type: 'url', required: false },
      { key: 'website', type: 'url', required: false },
    ],
  },
];

export const STATIC_STEPS_AFTER: StaticStepBase[] = [
  {
    id: 'resume-style',
    required: true,
    component: 'resume-style',
    icon: '🎨',
    fields: [{ key: 'resumeStyleId', type: 'text', required: true }],
  },
  { id: 'review', required: true, component: 'review', icon: '✓' },
  { id: 'complete', required: true, component: 'complete', icon: '🎉' },
];

export function buildStaticSteps(bases: StaticStepBase[], locale: string): StepMeta[] {
  return bases.map((base) => {
    const t = resolveStaticStep(base.id, locale);
    const fields = base.fields?.map((f) => ({ ...f, label: t.fields?.[f.key] ?? f.key }));

    let data: Record<string, unknown>[] | undefined;
    if (base.data) {
      const translatedData = { ...base.data };
      if (t.features) translatedData.features = t.features;
      data = [translatedData];
    }

    return {
      id: base.id,
      label: t.label,
      description: t.description,
      required: base.required,
      component: base.component,
      icon: base.icon,
      ...(fields ? { fields } : {}),
      ...(data ? { data } : {}),
    };
  });
}
