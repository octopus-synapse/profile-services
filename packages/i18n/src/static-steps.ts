import type { LocalizedRecord } from './types';

export interface WelcomeFeature {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface StepTranslation {
  readonly label: string;
  readonly description: string;
  readonly fields?: Readonly<Record<string, string>>;
  readonly features?: ReadonlyArray<WelcomeFeature>;
}

export const STATIC_STEP_DICTIONARY: Readonly<Record<string, LocalizedRecord<StepTranslation>>> = {
  welcome: {
    en: {
      label: 'Welcome',
      description: 'Create your professional resume in minutes',
      features: [
        { icon: '📄', title: 'ATS-Optimized Resume', description: 'Score 90+ guaranteed' },
        { icon: '🎨', title: 'Professional Templates', description: 'Clean design that impresses' },
        { icon: '⚡', title: 'Ready in Minutes', description: 'Guided step-by-step' },
        { icon: '🌐', title: 'Public Profile', description: 'Share with recruiters' },
      ],
    },
    'pt-BR': {
      label: 'Início',
      description: 'Crie seu currículo profissional em minutos',
      features: [
        { icon: '📄', title: 'Currículo ATS', description: 'Score 90+ garantido' },
        {
          icon: '🎨',
          title: 'Templates profissionais',
          description: 'Design limpo que impressiona',
        },
        {
          icon: '⚡',
          title: 'Pronto em minutos',
          description: 'Preenchimento guiado passo a passo',
        },
        { icon: '🌐', title: 'Perfil público', description: 'Compartilhe com recrutadores' },
      ],
    },
  },
  'personal-info': {
    en: {
      label: 'Personal Info',
      description: 'Personal Information',
      fields: { fullName: 'Full Name', phone: 'Phone', location: 'Location' },
    },
    'pt-BR': {
      label: 'Dados Pessoais',
      description: 'Informações Pessoais',
      fields: {
        fullName: 'Nome Completo',
        phone: 'Telefone',
        location: 'Localização',
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
  },
  'professional-profile': {
    en: {
      label: 'Profile',
      description: 'Professional Profile',
      fields: {
        jobTitle: 'Job Title',
        headline: 'Headline (1 line)',
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
        headline: 'Headline (1 linha)',
        summary: 'Resumo',
        linkedin: 'LinkedIn',
        github: 'GitHub',
        website: 'Website',
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
  },
  review: {
    en: { label: 'Review', description: 'Review & Submit' },
    'pt-BR': { label: 'Revisão', description: 'Revisar e Enviar' },
  },
  complete: {
    en: { label: 'Done', description: 'Setup Complete' },
    'pt-BR': { label: 'Pronto', description: 'Configuração Completa' },
  },
};

export function renderStaticStep(id: string, locale: string): StepTranslation {
  const entry = STATIC_STEP_DICTIONARY[id];
  return entry?.[locale as keyof typeof entry] ?? entry?.en ?? { label: id, description: id };
}
