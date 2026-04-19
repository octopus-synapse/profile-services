/**
 * Server-driven enum catalog.
 *
 * The frontend used to keep parallel TypeScript unions + label maps + icon
 * maps for every enum (NotificationType, JobApplicationEventType, etc.).
 * Adding a value meant a coordinated deploy. Now the UI fetches each enum's
 * full descriptor (value + i18n labels + icon hint + grouping) and renders
 * generically — backend is the single source of truth.
 */

export type SupportedLocale = 'pt-BR' | 'en';

export interface EnumValueDescriptor {
  value: string;
  /** Lucide icon name; UI maps to <component>. */
  icon: string;
  /** Optional UI grouping for tabs / sections (e.g. "engagement"). */
  group?: string;
  /** Tone hint — UI maps to color tokens. */
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  labels: Record<SupportedLocale, string>;
}

export interface EnumDescriptor {
  key: string;
  values: EnumValueDescriptor[];
}

const NOTIFICATION_TYPES: EnumValueDescriptor[] = [
  {
    value: 'POST_LIKED',
    icon: 'thumbs-up',
    group: 'engagement',
    tone: 'info',
    labels: { 'pt-BR': 'curtiu seu post', en: 'liked your post' },
  },
  {
    value: 'POST_COMMENTED',
    icon: 'message-circle',
    group: 'engagement',
    tone: 'info',
    labels: { 'pt-BR': 'comentou no seu post', en: 'commented on your post' },
  },
  {
    value: 'POST_REPOSTED',
    icon: 'repeat',
    group: 'engagement',
    tone: 'info',
    labels: { 'pt-BR': 'repostou seu post', en: 'reposted your post' },
  },
  {
    value: 'POST_BOOKMARKED',
    icon: 'bookmark',
    group: 'engagement',
    tone: 'neutral',
    labels: { 'pt-BR': 'salvou seu post', en: 'bookmarked your post' },
  },
  {
    value: 'COMMENT_REPLIED',
    icon: 'reply',
    group: 'engagement',
    tone: 'info',
    labels: { 'pt-BR': 'respondeu seu comentário', en: 'replied to your comment' },
  },
  {
    value: 'CONNECTION_REQUEST',
    icon: 'user-plus',
    group: 'connections',
    tone: 'info',
    labels: { 'pt-BR': 'enviou um pedido de conexão', en: 'sent a connection request' },
  },
  {
    value: 'CONNECTION_ACCEPTED',
    icon: 'user-check',
    group: 'connections',
    tone: 'success',
    labels: { 'pt-BR': 'aceitou sua conexão', en: 'accepted your connection' },
  },
  {
    value: 'FOLLOW_NEW',
    icon: 'user-plus',
    group: 'connections',
    tone: 'info',
    labels: { 'pt-BR': 'começou a seguir você', en: 'started following you' },
  },
  {
    value: 'SKILL_DECAY',
    icon: 'trending-down',
    group: 'engagement',
    tone: 'warning',
    labels: {
      'pt-BR': 'Uma das suas skills está parada — atualize para não perder relevância.',
      en: 'One of your skills has gone stale — refresh it to stay relevant.',
    },
  },
  {
    value: 'APPLICATION_STALE',
    icon: 'alarm-clock',
    group: 'engagement',
    tone: 'warning',
    labels: {
      'pt-BR': 'Aplicação sem resposta — vale enviar um follow-up.',
      en: 'An application got no reply — consider sending a follow-up.',
    },
  },
  {
    value: 'CONNECTION_RECOMMENDATION',
    icon: 'users',
    group: 'connections',
    tone: 'info',
    labels: {
      'pt-BR': 'Encontramos pessoas com skills parecidas com as suas.',
      en: 'We found people with overlapping skills.',
    },
  },
];

const JOB_APPLICATION_EVENT_TYPES: EnumValueDescriptor[] = [
  {
    value: 'SUBMITTED',
    icon: 'briefcase',
    tone: 'neutral',
    labels: { 'pt-BR': 'Enviada', en: 'Submitted' },
  },
  {
    value: 'VIEWED',
    icon: 'eye',
    tone: 'info',
    labels: { 'pt-BR': 'Visualizada', en: 'Viewed' },
  },
  {
    value: 'INTERVIEW_SCHEDULED',
    icon: 'calendar',
    tone: 'info',
    labels: { 'pt-BR': 'Entrevista marcada', en: 'Interview scheduled' },
  },
  {
    value: 'INTERVIEW_COMPLETED',
    icon: 'check-circle-2',
    tone: 'success',
    labels: { 'pt-BR': 'Entrevista concluída', en: 'Interview completed' },
  },
  {
    value: 'OFFER_RECEIVED',
    icon: 'check-circle-2',
    tone: 'success',
    labels: { 'pt-BR': 'Oferta recebida', en: 'Offer received' },
  },
  {
    value: 'REJECTED',
    icon: 'x-circle',
    tone: 'danger',
    labels: { 'pt-BR': 'Rejeitada', en: 'Rejected' },
  },
  {
    value: 'WITHDRAWN',
    icon: 'x-circle',
    tone: 'neutral',
    labels: { 'pt-BR': 'Retirada', en: 'Withdrawn' },
  },
  {
    value: 'FOLLOW_UP_SENT',
    icon: 'message-square-plus',
    tone: 'info',
    labels: { 'pt-BR': 'Follow-up enviado', en: 'Follow-up sent' },
  },
];

const EMAIL_DELIVERY_MODES: EnumValueDescriptor[] = [
  {
    value: 'INSTANT',
    icon: 'zap',
    tone: 'info',
    labels: { 'pt-BR': 'Instantâneo', en: 'Instant' },
  },
  {
    value: 'DAILY',
    icon: 'sun',
    tone: 'neutral',
    labels: { 'pt-BR': 'Resumo diário', en: 'Daily digest' },
  },
  {
    value: 'WEEKLY',
    icon: 'calendar-days',
    tone: 'neutral',
    labels: { 'pt-BR': 'Resumo semanal', en: 'Weekly digest' },
  },
  {
    value: 'OFF',
    icon: 'bell-off',
    tone: 'neutral',
    labels: { 'pt-BR': 'Desativado', en: 'Off' },
  },
];

export const ENUM_CATALOG: Record<string, EnumValueDescriptor[]> = {
  'notification-types': NOTIFICATION_TYPES,
  'job-application-event-types': JOB_APPLICATION_EVENT_TYPES,
  'email-delivery-modes': EMAIL_DELIVERY_MODES,
};

export function listEnumKeys(): string[] {
  return Object.keys(ENUM_CATALOG);
}

export function getEnum(key: string): EnumDescriptor | null {
  const values = ENUM_CATALOG[key];
  if (!values) return null;
  return { key, values };
}
