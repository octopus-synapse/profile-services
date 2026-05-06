/**
 * Route descriptors for the ui-metadata BC. Replaces
 * `UiMetadataController` and `MeDashboardController`.
 */

import { z } from 'zod';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const EnumKeyParams = z.object({ key: z.string() });

export const SettingsSectionParams = z.object({
  section: z.enum([
    'profile',
    'security',
    'notifications',
    'privacy',
    'integrations',
    'billing',
    'preferences',
    'one-click-apply',
  ]),
});

export interface SettingsField {
  readonly key: string;
  readonly type: 'text' | 'longtext' | 'email' | 'password' | 'enum' | 'boolean' | 'number';
  readonly label: string;
  readonly required: boolean;
  readonly placeholder?: string;
  readonly helpText?: string;
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface SettingsAction {
  readonly key: string;
  readonly label: string;
  readonly intent: 'primary' | 'danger' | 'secondary';
  readonly confirmRequired?: boolean;
  readonly endpoint: { method: string; path: string };
}

export interface SettingsInfoLine {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export interface SettingsSectionPayload {
  readonly section: string;
  readonly fields: readonly SettingsField[];
  readonly actions: readonly SettingsAction[];
  readonly info: readonly SettingsInfoLine[];
}

// ─── Response schemas ─────────────────────────────────────────────────
export const LocalizedLabelsSchema = z.object({
  'pt-BR': z.string(),
  en: z.string(),
});

export const EnumKeysResponseSchema = z.object({ keys: z.array(z.string()) });

export const EnumValueDescriptorSchema = z.object({
  value: z.string(),
  icon: z.string(),
  group: z.string().optional(),
  tone: z.enum(['neutral', 'info', 'success', 'warning', 'danger']).optional(),
  labels: LocalizedLabelsSchema,
});

export const EnumDescriptorResponseSchema = z.object({
  key: z.string(),
  values: z.array(EnumValueDescriptorSchema),
});

// Menu tree is bounded at two levels by `application/services/menu-builder.ts`
// (root nodes + a single layer of children). The schema mirrors that
// invariant explicitly instead of using `z.lazy`, which the swagger generator
// (`@asteasolutions/zod-to-openapi`) cannot serialise without an explicit
// `.openapi({ refId })` ceremony per recursive node.
export const MenuLeafSchema = z.object({
  id: z.string(),
  path: z.string(),
  icon: z.string(),
  labels: LocalizedLabelsSchema,
  requires: z.array(z.string()).optional(),
});

export const MenuNodeSchema = MenuLeafSchema.extend({
  children: z.array(MenuLeafSchema).optional(),
});

export const UserMenuResponseSchema = z.object({ menu: z.array(MenuNodeSchema) });

export const DashboardCounterSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().int(),
});

export const DashboardNotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  message: z.string(),
  messageKey: z.string().nullable(),
  // `messageParams` is a Prisma JSON column whose shape varies per
  // notification type — passthrough so arbitrary structured payloads
  // round-trip without losing fields.
  messageParams: z.object({}).passthrough().nullable(),
  read: z.boolean(),
  createdAt: IsoDateTimeSchema,
});

export const DashboardViewerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export const DashboardCtaSchema = z.object({ label: z.string(), href: z.string() });

export const DashboardWidgetSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.literal('greeting'),
    type: z.literal('greeting-hero'),
    title: z.string(),
    size: z.literal('wide'),
    data: z.object({ viewer: DashboardViewerSchema }),
  }),
  z.object({
    id: z.literal('counters'),
    type: z.literal('counter-grid'),
    title: z.string(),
    size: z.literal('wide'),
    data: z.object({ counters: z.array(DashboardCounterSchema) }),
  }),
  z.object({
    id: z.literal('recent-notifications'),
    type: z.literal('list'),
    title: z.string(),
    size: z.literal('half'),
    data: z.object({ items: z.array(DashboardNotificationSchema) }),
    cta: DashboardCtaSchema,
  }),
  z.object({
    id: z.literal('follow-ups'),
    type: z.literal('counter'),
    title: z.string(),
    size: z.literal('half'),
    data: z.object({ count: z.number().int() }),
    cta: DashboardCtaSchema,
  }),
]);

export const MeDashboardResponseSchema = z.object({
  widgets: z.array(DashboardWidgetSchema),
});

export const SettingsFieldSchema = z.object({
  key: z.string(),
  type: z.enum(['text', 'longtext', 'email', 'password', 'enum', 'boolean', 'number']),
  label: z.string(),
  required: z.boolean(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  maxLength: z.number().int().optional(),
  minLength: z.number().int().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});

export const SettingsActionSchema = z.object({
  key: z.string(),
  label: z.string(),
  intent: z.enum(['primary', 'danger', 'secondary']),
  confirmRequired: z.boolean().optional(),
  endpoint: z.object({ method: z.string(), path: z.string() }),
});

export const SettingsInfoLineSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
});

export const SettingsSectionResponseSchema = z.object({
  section: z.string(),
  fields: z.array(SettingsFieldSchema),
  actions: z.array(SettingsActionSchema),
  info: z.array(SettingsInfoLineSchema),
});

export function buildSettingsSection(
  section: string,
  user: { userId: string; email?: string | null },
): SettingsSectionPayload {
  switch (section) {
    case 'profile':
      return {
        section,
        fields: [
          {
            key: 'name',
            type: 'text',
            label: 'Nome completo',
            required: true,
            maxLength: 100,
          },
          { key: 'username', type: 'text', label: 'Username', required: false, maxLength: 30 },
          { key: 'bio', type: 'longtext', label: 'Bio', required: false, maxLength: 500 },
          { key: 'location', type: 'text', label: 'Localização', required: false, maxLength: 100 },
          { key: 'website', type: 'text', label: 'Website', required: false, maxLength: 200 },
        ],
        actions: [
          {
            key: 'save',
            label: 'Salvar',
            intent: 'primary',
            endpoint: { method: 'PUT', path: '/v1/users/profile' },
          },
        ],
        info: [{ key: 'email', label: 'E-mail', value: user.email ?? '' }],
      };
    case 'security':
      return {
        section,
        fields: [
          {
            key: 'currentPassword',
            type: 'password',
            label: 'Senha atual',
            required: true,
          },
          {
            key: 'newPassword',
            type: 'password',
            label: 'Nova senha',
            required: true,
            minLength: 8,
          },
        ],
        actions: [
          {
            key: 'change-password',
            label: 'Alterar senha',
            intent: 'primary',
            endpoint: { method: 'POST', path: '/v1/me/password/change' },
          },
          {
            key: 'enable-2fa',
            label: 'Configurar 2FA',
            intent: 'secondary',
            endpoint: { method: 'POST', path: '/v1/auth/2fa/setup' },
          },
        ],
        info: [],
      };
    case 'privacy':
      return {
        section,
        fields: [],
        actions: [
          {
            key: 'manage-blocked',
            label: 'Gerenciar usuários bloqueados',
            intent: 'secondary',
            endpoint: { method: 'GET', path: '/v1/chat/blocked' },
          },
          {
            key: 'export-data',
            label: 'Exportar meus dados',
            intent: 'secondary',
            endpoint: { method: 'GET', path: '/v1/me/gdpr-export' },
          },
          {
            key: 'delete-account',
            label: 'Excluir conta',
            intent: 'danger',
            confirmRequired: true,
            endpoint: { method: 'POST', path: '/v1/accounts/deactivate' },
          },
        ],
        info: [],
      };
    case 'notifications':
      return {
        section,
        fields: [],
        actions: [
          {
            key: 'load-types',
            label: 'Recarregar tipos',
            intent: 'secondary',
            endpoint: { method: 'GET', path: '/v1/notifications/types' },
          },
        ],
        info: [],
      };
    case 'integrations':
      return {
        section,
        fields: [],
        actions: [
          {
            key: 'connect-github',
            label: 'Conectar GitHub',
            intent: 'primary',
            endpoint: { method: 'POST', path: '/v1/integrations/github/connect' },
          },
        ],
        info: [],
      };
    case 'preferences':
      return {
        section,
        fields: [
          {
            key: 'language',
            type: 'enum',
            label: 'Idioma',
            required: false,
            options: [
              { value: 'pt-BR', label: 'Português (Brasil)' },
              { value: 'en', label: 'English' },
            ],
          },
          {
            key: 'theme',
            type: 'enum',
            label: 'Tema',
            required: false,
            options: [
              { value: 'system', label: 'Automático' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
            ],
          },
        ],
        actions: [
          {
            key: 'save',
            label: 'Salvar',
            intent: 'primary',
            endpoint: { method: 'PUT', path: '/v1/users/preferences' },
          },
        ],
        info: [],
      };
    case 'one-click-apply':
      return {
        section,
        fields: [
          {
            key: 'enabled',
            type: 'boolean',
            label: 'Ativar candidatura com um clique',
            required: false,
          },
        ],
        actions: [
          {
            key: 'save',
            label: 'Salvar',
            intent: 'primary',
            endpoint: { method: 'PUT', path: '/v1/users/preferences' },
          },
        ],
        info: [],
      };
    case 'billing':
      return {
        section,
        fields: [],
        actions: [],
        info: [{ key: 'plan', label: 'Plano atual', value: 'Gratuito' }],
      };
    default:
      throw new EntityNotFoundException('SettingsSection', section);
  }
}
