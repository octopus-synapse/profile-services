/**
 * Prisma-enum label dictionary.
 *
 * One entry per `(enumName, value)` pair declared in `prisma/schema/*.prisma`.
 * Parity is enforced by `i18n-enum-parity.architecture.spec.ts` against the
 * live schema, so a new enum value is a compile-time break until the
 * translations exist.
 *
 * Values that only exist for backend/audit purposes (ex. `AnalyticsEvent`,
 * `AuditAction`, `AttestationWitnessStatus`, `EmailStatus`, `EmailDeliveryMode`)
 * still get translations — cheap to maintain, and they show up in the admin
 * panel.
 */

import type { LocalizedMessages } from './types';

export type EnumDictionary = Readonly<Record<string, Readonly<Record<string, LocalizedMessages>>>>;

export const ENUM_DICTIONARY = {
  ActivityType: {
    ACHIEVEMENT_EARNED: { en: 'Achievement earned', 'pt-BR': 'Conquista obtida' },
    CONNECTED_USER: { en: 'Connected with user', 'pt-BR': 'Conectou-se com usuário' },
    FOLLOWED_USER: { en: 'Followed user', 'pt-BR': 'Seguiu usuário' },
    PROFILE_UPDATED: { en: 'Profile updated', 'pt-BR': 'Perfil atualizado' },
    RESUME_CREATED: { en: 'Resume created', 'pt-BR': 'Currículo criado' },
    RESUME_PUBLISHED: { en: 'Resume published', 'pt-BR': 'Currículo publicado' },
    RESUME_SHARED: { en: 'Resume shared', 'pt-BR': 'Currículo compartilhado' },
    RESUME_UPDATED: { en: 'Resume updated', 'pt-BR': 'Currículo atualizado' },
    SKILL_ADDED: { en: 'Skill added', 'pt-BR': 'Habilidade adicionada' },
    THEME_PUBLISHED: { en: 'Theme published', 'pt-BR': 'Tema publicado' },
  },
  AnalyticsEvent: {
    DOWNLOAD: { en: 'Download', 'pt-BR': 'Download' },
    VIEW: { en: 'View', 'pt-BR': 'Visualização' },
  },
  AnonymousCategory: {
    HARASSMENT: { en: 'Harassment', 'pt-BR': 'Assédio' },
    INTERVIEW: { en: 'Interview', 'pt-BR': 'Entrevista' },
    LAYOFF: { en: 'Layoff', 'pt-BR': 'Demissão' },
    SALARY: { en: 'Salary', 'pt-BR': 'Salário' },
    TOXIC_CULTURE: { en: 'Toxic culture', 'pt-BR': 'Cultura tóxica' },
  },
  ApplyMode: {
    AUTO_APPLY: { en: 'Auto-apply', 'pt-BR': 'Candidatura automática' },
    ONE_CLICK: { en: 'One-click', 'pt-BR': 'Um clique' },
    WEEKLY_CURATED: { en: 'Weekly curated', 'pt-BR': 'Curadoria semanal' },
  },
  AttestationWitnessStatus: {
    FAILED: { en: 'Failed', 'pt-BR': 'Falhou' },
    PENDING: { en: 'Pending', 'pt-BR': 'Pendente' },
    RUNNING: { en: 'Running', 'pt-BR': 'Em execução' },
    SUCCEEDED: { en: 'Succeeded', 'pt-BR': 'Concluído com sucesso' },
  },
  AuditAction: {
    ACCESS_MODIFIER_APPLIED: {
      en: 'Access modifier applied',
      'pt-BR': 'Modificador de acesso aplicado',
    },
    ACCESS_MODIFIER_REVOKED: {
      en: 'Access modifier revoked',
      'pt-BR': 'Modificador de acesso revogado',
    },
    ACCOUNT_DELETED: { en: 'Account deleted', 'pt-BR': 'Conta excluída' },
    DATA_EXPORT_DOWNLOADED: {
      en: 'Data export downloaded',
      'pt-BR': 'Exportação de dados baixada',
    },
    DATA_EXPORT_REQUESTED: {
      en: 'Data export requested',
      'pt-BR': 'Exportação de dados solicitada',
    },
    EMAIL_CHANGED: { en: 'Email changed', 'pt-BR': 'E-mail alterado' },
    FEATURE_FLAG_TOGGLED: {
      en: 'Feature flag toggled',
      'pt-BR': 'Feature flag alternada',
    },
    ONBOARDING_COMPLETED: { en: 'Onboarding completed', 'pt-BR': 'Onboarding concluído' },
    PASSWORD_CHANGED: { en: 'Password changed', 'pt-BR': 'Senha alterada' },
    PREFERENCES_UPDATED: { en: 'Preferences updated', 'pt-BR': 'Preferências atualizadas' },
    PRIVACY_POLICY_ACCEPTED: {
      en: 'Privacy policy accepted',
      'pt-BR': 'Política de privacidade aceita',
    },
    PROFILE_UPDATED: { en: 'Profile updated', 'pt-BR': 'Perfil atualizado' },
    RESUME_CREATED: { en: 'Resume created', 'pt-BR': 'Currículo criado' },
    RESUME_DELETED: { en: 'Resume deleted', 'pt-BR': 'Currículo excluído' },
    RESUME_UPDATED: { en: 'Resume updated', 'pt-BR': 'Currículo atualizado' },
    RESUME_VISIBILITY_CHANGED: {
      en: 'Resume visibility changed',
      'pt-BR': 'Visibilidade do currículo alterada',
    },
    ROLE_CHANGED: { en: 'Role changed', 'pt-BR': 'Papel alterado' },
    TOS_ACCEPTED: { en: 'Terms of service accepted', 'pt-BR': 'Termos de serviço aceitos' },
    TWO_FACTOR_DISABLED: { en: 'Two-factor disabled', 'pt-BR': 'Dois fatores desativado' },
    TWO_FACTOR_ENABLED: { en: 'Two-factor enabled', 'pt-BR': 'Dois fatores ativado' },
    UNAUTHORIZED_ACCESS_ATTEMPT: {
      en: 'Unauthorized access attempt',
      'pt-BR': 'Tentativa de acesso não autorizado',
    },
    USERNAME_CHANGED: { en: 'Username changed', 'pt-BR': 'Nome de usuário alterado' },
    USER_LOGIN: { en: 'User login', 'pt-BR': 'Login realizado' },
    USER_LOGOUT: { en: 'User logout', 'pt-BR': 'Logout realizado' },
    // P1-035 — auth/session lifecycle audit events.
    LOGIN_FAILED: { en: 'Login failed', 'pt-BR': 'Falha de login' },
    USER_LOGGED_IN: { en: 'User logged in', 'pt-BR': 'Usuário logou' },
    USER_LOGGED_OUT: { en: 'User logged out', 'pt-BR': 'Usuário deslogou' },
    SESSION_CREATED: { en: 'Session created', 'pt-BR': 'Sessão criada' },
    SESSION_TERMINATED: { en: 'Session terminated', 'pt-BR': 'Sessão encerrada' },
    TOKEN_REFRESHED: { en: 'Token refreshed', 'pt-BR': 'Token renovado' },
    // P1-035 — export, social, and resume-version audit events.
    EXPORT_REQUESTED: { en: 'Export requested', 'pt-BR': 'Exportação solicitada' },
    EXPORT_COMPLETED: { en: 'Export completed', 'pt-BR': 'Exportação concluída' },
    EXPORT_FAILED: { en: 'Export failed', 'pt-BR': 'Exportação falhou' },
    USER_FOLLOWED: { en: 'User followed', 'pt-BR': 'Usuário seguido' },
    CONNECTION_REQUESTED: { en: 'Connection requested', 'pt-BR': 'Conexão solicitada' },
    SHARE_DOWNLOADED: { en: 'Share downloaded', 'pt-BR': 'Compartilhamento baixado' },
    RESUME_VERSION_CREATED: { en: 'Resume version created', 'pt-BR': 'Versão do currículo criada' },
    RESUME_VERSION_RESTORED: {
      en: 'Resume version restored',
      'pt-BR': 'Versão do currículo restaurada',
    },
  },
  BadgeKind: {
    ATS_90_PLUS: { en: 'ATS 90+', 'pt-BR': 'ATS 90+' },
    CONTRIBUTOR: { en: 'Contributor', 'pt-BR': 'Contribuidor' },
    EVENT_SPEAKER: { en: 'Event speaker', 'pt-BR': 'Palestrante em evento' },
    FIRST_BUILD: { en: 'First build', 'pt-BR': 'Primeiro build' },
    INTERVIEWS_5: { en: '5 interviews', 'pt-BR': '5 entrevistas' },
    MENTORED_10: { en: 'Mentored 10', 'pt-BR': 'Mentorou 10' },
  },
  CollaboratorRole: {
    ADMIN: { en: 'Admin', 'pt-BR': 'Administrador' },
    EDITOR: { en: 'Editor', 'pt-BR': 'Editor' },
    VIEWER: { en: 'Viewer', 'pt-BR': 'Visualizador' },
  },
  ConnectionStatus: {
    ACCEPTED: { en: 'Accepted', 'pt-BR': 'Aceita' },
    PENDING: { en: 'Pending', 'pt-BR': 'Pendente' },
    REJECTED: { en: 'Rejected', 'pt-BR': 'Recusada' },
  },
  ConsentDocumentType: {
    MARKETING_CONSENT: { en: 'Marketing consent', 'pt-BR': 'Consentimento de marketing' },
    PRIVACY_POLICY: { en: 'Privacy policy', 'pt-BR': 'Política de privacidade' },
    TERMS_OF_SERVICE: { en: 'Terms of service', 'pt-BR': 'Termos de serviço' },
  },
  DigestFrequency: {
    DAILY: { en: 'Daily', 'pt-BR': 'Diário' },
    MONTHLY: { en: 'Monthly', 'pt-BR': 'Mensal' },
    NEVER: { en: 'Never', 'pt-BR': 'Nunca' },
    WEEKLY: { en: 'Weekly', 'pt-BR': 'Semanal' },
  },
  EmailDeliveryMode: {
    DAILY: { en: 'Daily digest', 'pt-BR': 'Resumo diário' },
    INSTANT: { en: 'Instant', 'pt-BR': 'Instantâneo' },
    OFF: { en: 'Off', 'pt-BR': 'Desativado' },
    WEEKLY: { en: 'Weekly digest', 'pt-BR': 'Resumo semanal' },
  },
  EmailStatus: {
    BOUNCED: { en: 'Bounced', 'pt-BR': 'Rejeitado' },
    FAILED: { en: 'Failed', 'pt-BR': 'Falhou' },
    PENDING: { en: 'Pending', 'pt-BR': 'Pendente' },
    SENT: { en: 'Sent', 'pt-BR': 'Enviado' },
  },
  EnglishLevel: {
    ADVANCED: { en: 'Advanced', 'pt-BR': 'Avançado' },
    BASIC: { en: 'Basic', 'pt-BR': 'Básico' },
    FLUENT: { en: 'Fluent', 'pt-BR': 'Fluente' },
    INTERMEDIATE: { en: 'Intermediate', 'pt-BR': 'Intermediário' },
  },
  ImportSource: {
    DOCX: { en: 'DOCX', 'pt-BR': 'DOCX' },
    GITHUB: { en: 'GitHub', 'pt-BR': 'GitHub' },
    JSON: { en: 'JSON', 'pt-BR': 'JSON' },
    LINKEDIN: { en: 'LinkedIn', 'pt-BR': 'LinkedIn' },
    PDF: { en: 'PDF', 'pt-BR': 'PDF' },
  },
  ImportStatus: {
    COMPLETED: { en: 'Completed', 'pt-BR': 'Concluído' },
    FAILED: { en: 'Failed', 'pt-BR': 'Falhou' },
    IMPORTING: { en: 'Importing', 'pt-BR': 'Importando' },
    MAPPING: { en: 'Mapping', 'pt-BR': 'Mapeando' },
    PARTIAL: { en: 'Partial', 'pt-BR': 'Parcial' },
    PENDING: { en: 'Pending', 'pt-BR': 'Pendente' },
    PROCESSING: { en: 'Processing', 'pt-BR': 'Processando' },
    VALIDATING: { en: 'Validating', 'pt-BR': 'Validando' },
  },
  JobApplicationEventType: {
    FOLLOW_UP_SENT: { en: 'Follow-up sent', 'pt-BR': 'Follow-up enviado' },
    INTERVIEW_COMPLETED: { en: 'Interview completed', 'pt-BR': 'Entrevista concluída' },
    INTERVIEW_SCHEDULED: { en: 'Interview scheduled', 'pt-BR': 'Entrevista agendada' },
    OFFER_RECEIVED: { en: 'Offer received', 'pt-BR': 'Proposta recebida' },
    REJECTED: { en: 'Rejected', 'pt-BR': 'Recusado' },
    SUBMITTED: { en: 'Submitted', 'pt-BR': 'Enviado' },
    VIEWED: { en: 'Viewed by recruiter', 'pt-BR': 'Visualizado pelo recrutador' },
    WITHDRAWN: { en: 'Withdrawn', 'pt-BR': 'Retirada' },
  },
  JobApplicationStatus: {
    ACCEPTED: { en: 'Accepted', 'pt-BR': 'Aceito' },
    REJECTED: { en: 'Rejected', 'pt-BR': 'Recusado' },
    SUBMITTED: { en: 'Submitted', 'pt-BR': 'Enviado' },
    VIEWED: { en: 'Viewed', 'pt-BR': 'Visualizado' },
    WITHDRAWN: { en: 'Withdrawn', 'pt-BR': 'Retirado' },
  },
  JobType: {
    CONTRACT: { en: 'Contract', 'pt-BR': 'Contrato' },
    FREELANCE: { en: 'Freelance', 'pt-BR': 'Freelance' },
    FULL_TIME: { en: 'Full-time', 'pt-BR': 'Tempo integral' },
    INTERNSHIP: { en: 'Internship', 'pt-BR': 'Estágio' },
    PART_TIME: { en: 'Part-time', 'pt-BR': 'Meio período' },
    VOLUNTEER: { en: 'Volunteer', 'pt-BR': 'Voluntário' },
  },
  MecSyncStatus: {
    FAILED: { en: 'Failed', 'pt-BR': 'Falhou' },
    PARTIAL: { en: 'Partial', 'pt-BR': 'Parcial' },
    RUNNING: { en: 'Running', 'pt-BR': 'Em execução' },
    SUCCESS: { en: 'Success', 'pt-BR': 'Sucesso' },
  },
  NotificationType: {
    APPLICATION_STALE: { en: 'Application stale', 'pt-BR': 'Candidatura parada' },
    COMMENT_REPLIED: { en: 'Reply to your comment', 'pt-BR': 'Resposta ao seu comentário' },
    CONNECTION_ACCEPTED: { en: 'Connection accepted', 'pt-BR': 'Conexão aceita' },
    CONNECTION_RECOMMENDATION: {
      en: 'Connection recommendation',
      'pt-BR': 'Recomendação de conexão',
    },
    CONNECTION_REQUEST: { en: 'Connection request', 'pt-BR': 'Pedido de conexão' },
    FIT_PROFILE_EXPIRED: { en: 'Fit profile expired', 'pt-BR': 'Perfil de fit expirou' },
    FIT_PROFILE_EXPIRY_REMINDER: {
      en: 'Fit profile expires soon',
      'pt-BR': 'Perfil de fit expira em breve',
    },
    FOLLOW_NEW: { en: 'New follower', 'pt-BR': 'Novo seguidor' },
    MATCH_RECOMMENDATIONS_READY: {
      en: 'New job recommendations ready',
      'pt-BR': 'Novas recomendações de vagas',
    },
    POST_BOOKMARKED: { en: 'Post bookmarked', 'pt-BR': 'Post salvo' },
    POST_COMMENTED: { en: 'New comment', 'pt-BR': 'Novo comentário' },
    POST_LIKED: { en: 'Post liked', 'pt-BR': 'Post curtido' },
    POST_REPOSTED: { en: 'Post reposted', 'pt-BR': 'Post repostado' },
    RESUME_QUALITY_IMPROVED: {
      en: 'Resume quality improved',
      'pt-BR': 'Qualidade do currículo melhorou',
    },
    RESUME_QUALITY_REGRESSED: {
      en: 'Resume quality dropped',
      'pt-BR': 'Qualidade do currículo caiu',
    },
    SKILL_DECAY: { en: 'Skill getting rusty', 'pt-BR': 'Habilidade enferrujando' },
  },
  PaymentCurrency: {
    BRL: { en: 'BRL', 'pt-BR': 'BRL' },
    EUR: { en: 'EUR', 'pt-BR': 'EUR' },
    GBP: { en: 'GBP', 'pt-BR': 'GBP' },
    USD: { en: 'USD', 'pt-BR': 'USD' },
  },
  PostType: {
    ACHIEVEMENT: { en: 'Achievement', 'pt-BR': 'Conquista' },
    BUILD: { en: 'Build', 'pt-BR': 'Build' },
    CHALLENGE: { en: 'Challenge', 'pt-BR': 'Desafio' },
    LEARNING: { en: 'Learning', 'pt-BR': 'Aprendizado' },
    OPPORTUNITY: { en: 'Opportunity', 'pt-BR': 'Oportunidade' },
    QUESTION: { en: 'Question', 'pt-BR': 'Pergunta' },
    REPOST: { en: 'Repost', 'pt-BR': 'Repostagem' },
  },
  ReactionType: {
    CELEBRATE: { en: 'Celebrate', 'pt-BR': 'Celebrar' },
    CURIOUS: { en: 'Curious', 'pt-BR': 'Curioso' },
    INSIGHTFUL: { en: 'Insightful', 'pt-BR': 'Perspicaz' },
    LIKE: { en: 'Like', 'pt-BR': 'Curtir' },
    LOVE: { en: 'Love', 'pt-BR': 'Adorar' },
  },
  RemotePolicy: {
    HYBRID: { en: 'Hybrid', 'pt-BR': 'Híbrido' },
    ONSITE: { en: 'Onsite', 'pt-BR': 'Presencial' },
    REMOTE: { en: 'Remote', 'pt-BR': 'Remoto' },
  },
  ReportStatus: {
    DISMISSED: { en: 'Dismissed', 'pt-BR': 'Descartada' },
    PENDING: { en: 'Pending', 'pt-BR': 'Pendente' },
    REVIEWED: { en: 'Reviewed', 'pt-BR': 'Revisada' },
  },
  LayoutKind: {
    SINGLE_COLUMN: { en: 'Single column', 'pt-BR': 'Coluna única' },
    DOUBLE_COLUMN: { en: 'Two columns', 'pt-BR': 'Duas colunas' },
  },
  FitDimension: {
    BIG_FIVE_OPENNESS: { en: 'Openness', 'pt-BR': 'Abertura' },
    BIG_FIVE_CONSCIENTIOUSNESS: { en: 'Conscientiousness', 'pt-BR': 'Conscienciosidade' },
    BIG_FIVE_EXTRAVERSION: { en: 'Extraversion', 'pt-BR': 'Extroversão' },
    BIG_FIVE_AGREEABLENESS: { en: 'Agreeableness', 'pt-BR': 'Amabilidade' },
    BIG_FIVE_NEUROTICISM: { en: 'Neuroticism', 'pt-BR': 'Neuroticismo' },
    SCHWARTZ_SELF_DIRECTION: { en: 'Self-direction', 'pt-BR': 'Autodireção' },
    SCHWARTZ_STIMULATION: { en: 'Stimulation', 'pt-BR': 'Estímulo' },
    SCHWARTZ_HEDONISM: { en: 'Hedonism', 'pt-BR': 'Hedonismo' },
    SCHWARTZ_ACHIEVEMENT: { en: 'Achievement', 'pt-BR': 'Realização' },
    SCHWARTZ_POWER: { en: 'Power', 'pt-BR': 'Poder' },
    SCHWARTZ_SECURITY: { en: 'Security', 'pt-BR': 'Segurança' },
    SCHWARTZ_CONFORMITY: { en: 'Conformity', 'pt-BR': 'Conformidade' },
    SCHWARTZ_TRADITION: { en: 'Tradition', 'pt-BR': 'Tradição' },
    SCHWARTZ_BENEVOLENCE: { en: 'Benevolence', 'pt-BR': 'Benevolência' },
    SCHWARTZ_UNIVERSALISM: { en: 'Universalism', 'pt-BR': 'Universalismo' },
    SDT_AUTONOMY: { en: 'Autonomy', 'pt-BR': 'Autonomia' },
    SDT_COMPETENCE: { en: 'Competence', 'pt-BR': 'Competência' },
    SDT_RELATEDNESS: { en: 'Relatedness', 'pt-BR': 'Vínculo' },
  },
  SkillProficiency: {
    ADVANCED: { en: 'Advanced', 'pt-BR': 'Avançado' },
    BEGINNER: { en: 'Beginner', 'pt-BR': 'Iniciante' },
    EXPERT: { en: 'Expert', 'pt-BR': 'Especialista' },
    INTERMEDIATE: { en: 'Intermediate', 'pt-BR': 'Intermediário' },
  },
  SkillType: {
    CERTIFICATION: { en: 'Certification', 'pt-BR': 'Certificação' },
    DATABASE: { en: 'Database', 'pt-BR': 'Banco de dados' },
    FRAMEWORK: { en: 'Framework', 'pt-BR': 'Framework' },
    LANGUAGE: { en: 'Language', 'pt-BR': 'Linguagem' },
    LIBRARY: { en: 'Library', 'pt-BR': 'Biblioteca' },
    METHODOLOGY: { en: 'Methodology', 'pt-BR': 'Metodologia' },
    OTHER: { en: 'Other', 'pt-BR': 'Outro' },
    PLATFORM: { en: 'Platform', 'pt-BR': 'Plataforma' },
    SOFT_SKILL: { en: 'Soft skill', 'pt-BR': 'Soft skill' },
    TOOL: { en: 'Tool', 'pt-BR': 'Ferramenta' },
  },
  SuccessStoryStatus: {
    ARCHIVED: { en: 'Archived', 'pt-BR': 'Arquivada' },
    DRAFT: { en: 'Draft', 'pt-BR': 'Rascunho' },
    PENDING_REVIEW: { en: 'Pending review', 'pt-BR': 'Aguardando revisão' },
    PUBLISHED: { en: 'Published', 'pt-BR': 'Publicada' },
  },
  TechAreaType: {
    DATA: { en: 'Data', 'pt-BR': 'Dados' },
    DESIGN: { en: 'Design', 'pt-BR': 'Design' },
    DEVELOPMENT: { en: 'Development', 'pt-BR': 'Desenvolvimento' },
    DEVOPS: { en: 'DevOps', 'pt-BR': 'DevOps' },
    INFRASTRUCTURE: { en: 'Infrastructure', 'pt-BR': 'Infraestrutura' },
    OTHER: { en: 'Other', 'pt-BR': 'Outro' },
    PRODUCT: { en: 'Product', 'pt-BR': 'Produto' },
    QA: { en: 'QA', 'pt-BR': 'QA' },
    SECURITY: { en: 'Security', 'pt-BR': 'Segurança' },
  },
  ModifierEffect: {
    DENY: { en: 'Deny', 'pt-BR': 'Negar' },
    GRANT: { en: 'Grant', 'pt-BR': 'Conceder' },
  },
  ModifierType: {
    SUSPEND_EMAIL_VERIFIED: {
      en: 'Suspend email-verified state',
      'pt-BR': 'Suspender estado de e-mail verificado',
    },
    SUSPEND_ONBOARDING: {
      en: 'Suspend onboarding-completed state',
      'pt-BR': 'Suspender estado de onboarding concluído',
    },
    SUSPEND_ROLE_USER: {
      en: 'Suspend `user` role',
      'pt-BR': 'Suspender role `user`',
    },
    SUSPEND_ROLE_ADMIN: {
      en: 'Suspend `admin` role',
      'pt-BR': 'Suspender role `admin`',
    },
    GRANT_PERMISSION: {
      en: 'Grant individual permission',
      'pt-BR': 'Conceder permissão individual',
    },
  },
  WeeklyCuratedBatchStatus: {
    COMPLETED: { en: 'Completed', 'pt-BR': 'Concluído' },
    FAILED: { en: 'Failed', 'pt-BR': 'Falhou' },
    PENDING: { en: 'Pending', 'pt-BR': 'Pendente' },
    SENT: { en: 'Sent', 'pt-BR': 'Enviado' },
  },
  WeeklyCuratedItemStatus: {
    APPROVED: { en: 'Approved', 'pt-BR': 'Aprovado' },
    EXPIRED: { en: 'Expired', 'pt-BR': 'Expirado' },
    PENDING_APPROVAL: { en: 'Pending approval', 'pt-BR': 'Aguardando aprovação' },
    REJECTED: { en: 'Rejected', 'pt-BR': 'Recusado' },
  },
} as const satisfies EnumDictionary;

export type EnumName = keyof typeof ENUM_DICTIONARY;
