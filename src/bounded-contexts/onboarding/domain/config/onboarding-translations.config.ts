import type { StepTranslation } from './onboarding-steps.types';

export const STATIC_STEP_TRANSLATIONS: Record<string, Record<string, StepTranslation>> = {
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
    es: {
      label: 'Inicio',
      description: 'Crea tu currículum profesional en minutos',
      features: [
        { icon: '📄', title: 'Currículum ATS', description: 'Puntuación 90+ garantizada' },
        {
          icon: '🎨',
          title: 'Plantillas profesionales',
          description: 'Diseño limpio que impresiona',
        },
        { icon: '⚡', title: 'Listo en minutos', description: 'Guía paso a paso' },
        { icon: '🌐', title: 'Perfil público', description: 'Comparte con reclutadores' },
      ],
    },
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

export function resolveStaticStep(id: string, locale: string): StepTranslation {
  const translations = STATIC_STEP_TRANSLATIONS[id];
  return translations?.[locale] ?? translations?.en ?? { label: id, description: id };
}
