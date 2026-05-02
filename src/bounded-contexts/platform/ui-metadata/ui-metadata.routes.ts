/**
 * Route descriptors for the ui-metadata BC. Replaces
 * `UiMetadataController` and `MeDashboardController`.
 */

import { z } from 'zod';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Route } from '@/shared-kernel/http/route';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';

const EnumKeyParams = z.object({ key: z.string() });

const SettingsSectionParams = z.object({
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

interface SettingsField {
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

interface SettingsAction {
  readonly key: string;
  readonly label: string;
  readonly intent: 'primary' | 'danger' | 'secondary';
  readonly confirmRequired?: boolean;
  readonly endpoint: { method: string; path: string };
}

interface SettingsInfoLine {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

interface SettingsSectionPayload {
  readonly section: string;
  readonly fields: readonly SettingsField[];
  readonly actions: readonly SettingsAction[];
  readonly info: readonly SettingsInfoLine[];
}

// ─── Response schemas ─────────────────────────────────────────────────
const LocalizedLabelsSchema = z.object({
  'pt-BR': z.string(),
  en: z.string(),
});

const EnumKeysResponseSchema = z.object({ keys: z.array(z.string()) });

const EnumValueDescriptorSchema = z.object({
  value: z.string(),
  icon: z.string(),
  group: z.string().optional(),
  tone: z.enum(['neutral', 'info', 'success', 'warning', 'danger']).optional(),
  labels: LocalizedLabelsSchema,
});

const EnumDescriptorResponseSchema = z.object({
  key: z.string(),
  values: z.array(EnumValueDescriptorSchema),
});

// Menu tree is bounded at two levels by `application/services/menu-builder.ts`
// (root nodes + a single layer of children). The schema mirrors that
// invariant explicitly instead of using `z.lazy`, which the swagger generator
// (`@asteasolutions/zod-to-openapi`) cannot serialise without an explicit
// `.openapi({ refId })` ceremony per recursive node.
const MenuLeafSchema = z.object({
  id: z.string(),
  path: z.string(),
  icon: z.string(),
  labels: LocalizedLabelsSchema,
  requires: z.array(z.string()).optional(),
});

const MenuNodeSchema = MenuLeafSchema.extend({
  children: z.array(MenuLeafSchema).optional(),
});

const UserMenuResponseSchema = z.object({ menu: z.array(MenuNodeSchema) });

const DashboardCounterSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().int(),
});

const DashboardNotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  message: z.string(),
  messageKey: z.string().nullable(),
  // `messageParams` is a Prisma JSON column whose shape varies per
  // notification type — passthrough so arbitrary structured payloads
  // round-trip without losing fields.
  messageParams: z.object({}).passthrough().nullable(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
});

const DashboardViewerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});

const DashboardCtaSchema = z.object({ label: z.string(), href: z.string() });

const DashboardWidgetSchema = z.discriminatedUnion('type', [
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

const MeDashboardResponseSchema = z.object({
  widgets: z.array(DashboardWidgetSchema),
});

const SettingsFieldSchema = z.object({
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

const SettingsActionSchema = z.object({
  key: z.string(),
  label: z.string(),
  intent: z.enum(['primary', 'danger', 'secondary']),
  confirmRequired: z.boolean().optional(),
  endpoint: z.object({ method: z.string(), path: z.string() }),
});

const SettingsInfoLineSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
});

const SettingsSectionResponseSchema = z.object({
  section: z.string(),
  fields: z.array(SettingsFieldSchema),
  actions: z.array(SettingsActionSchema),
  info: z.array(SettingsInfoLineSchema),
});

function buildSettingsSection(
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

export const uiMetadataRoutes: ReadonlyArray<Route<UiMetadataUseCases>> = [
  {
    method: 'GET',
    path: '/v1/enums',
    auth: { kind: 'public' },
    response: EnumKeysResponseSchema,
    openapi: {
      summary: 'List all enum keys exposed by the catalog.',
      tags: ['ui-metadata'],
      description: 'Server-driven UI metadata',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      return bc.listEnumKeys.execute();
    },
  },
  {
    method: 'GET',
    path: '/v1/enums/:key',
    auth: { kind: 'public' },
    params: EnumKeyParams,
    response: EnumDescriptorResponseSchema,
    openapi: {
      summary:
        'Full descriptor for a UI enum (notification-types, job-application-event-types, etc.) with localized labels + icon hints.',
      tags: ['ui-metadata'],
      description: 'Server-driven UI metadata',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { key } = ctx.params as { key: string };
      const out = bc.getEnumDescriptor.execute(key);
      if (!out) {
        throw new EntityNotFoundException('Enum', key);
      }
      return out;
    },
  },
  {
    method: 'GET',
    path: '/v1/me/menu',
    auth: { kind: 'jwt' },
    response: UserMenuResponseSchema,
    openapi: {
      summary:
        'Permission-aware navigation tree for the current user with labels in the request locale.',
      tags: ['ui-metadata'],
      description: 'Server-driven UI metadata',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const menu = await bc.getUserMenu.execute(ctx.user!.userId);
      return { menu };
    },
  },
  {
    method: 'GET',
    path: '/v1/pages/me-dashboard',
    auth: { kind: 'jwt' },
    response: MeDashboardResponseSchema,
    openapi: {
      summary: 'Composite dashboard widgets (server-driven)',
      tags: ['pages'],
      description:
        'Returns `{widgets:[{id,type,title,size,data,actions?,cta?}]}`. Adding/removing widgets is a backend-only change. Today the server emits widgets for greeting, counters, recent notifications and follow-ups; the frontend simply iterates `widgets[]` and dispatches on `type`.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const data = await bc.loadMeDashboard.execute(ctx.user!.userId);
      return {
        widgets: [
          {
            id: 'greeting',
            type: 'greeting-hero' as const,
            title: data.viewer.name ?? data.viewer.email ?? 'Olá',
            size: 'wide' as const,
            data: { viewer: data.viewer },
          },
          {
            id: 'counters',
            type: 'counter-grid' as const,
            title: 'Resumo',
            size: 'wide' as const,
            data: {
              counters: [
                { key: 'resumes', label: 'Currículos', value: data.counts.resumes },
                { key: 'applications', label: 'Aplicações', value: data.counts.applications },
                {
                  key: 'unreadNotifications',
                  label: 'Notificações',
                  value: data.counts.unreadNotifications,
                },
                { key: 'followers', label: 'Seguidores', value: data.counts.followers },
                { key: 'following', label: 'Seguindo', value: data.counts.following },
              ],
            },
          },
          {
            id: 'recent-notifications',
            type: 'list' as const,
            title: 'Atividade recente',
            size: 'half' as const,
            data: { items: data.recentNotifications },
            cta: { label: 'Ver todas', href: '/social/notifications' },
          },
          {
            id: 'follow-ups',
            type: 'counter' as const,
            title: 'Aplicações para acompanhar',
            size: 'half' as const,
            data: { count: data.pendingFollowUps },
            cta: { label: 'Ver aplicações', href: '/careers/browse-jobs/applications' },
          },
        ],
      };
    },
  },
  {
    method: 'GET',
    path: '/v1/pages/settings/:section',
    auth: { kind: 'jwt' },
    params: SettingsSectionParams,
    response: SettingsSectionResponseSchema,
    openapi: {
      summary: 'Server-driven settings section (fields + actions + info)',
      tags: ['pages'],
      description:
        'Returns `{section, fields:[...], actions:[...], info:[...]}`. The frontend renders settings pages from this payload — adding a setting field or action is a backend-only change.',
    },
    sdk: { exported: true },
    handler: async (ctx) => {
      const { section } = ctx.params as z.infer<typeof SettingsSectionParams>;
      return buildSettingsSection(section, {
        userId: ctx.user!.userId,
        email: ctx.user!.email,
      });
    },
  },
];
