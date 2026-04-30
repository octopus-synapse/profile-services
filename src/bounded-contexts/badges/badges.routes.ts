/**
 * Route descriptors for the badges BC — golden output for the
 * framework-decoupling roadmap. Replaces `BadgeController`.
 *
 * The handlers are pure async functions that receive the framework-
 * free `HttpCtx` plus the use-case bundle. The Nest adapter
 * (`src/infrastructure/nest-adapter/synthesize-controller.ts`) turns
 * each `Route` into a Nest `@Controller` at boot.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { BadgesUseCases } from './application/ports/badges.port';

const ListForUserParams = z.object({ userId: z.string() });

export const badgesRoutes: ReadonlyArray<Route<BadgesUseCases>> = [
  {
    method: 'GET',
    path: '/v1/badges/me',
    auth: { kind: 'jwt' },
    openapi: {
      summary: 'Badges awarded to the viewer.',
      tags: ['badges'],
      description: 'User achievement badges',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const badges = await bc.listUserBadges.execute(ctx.user!.userId);
      return { badges };
    },
  },
  {
    method: 'GET',
    path: '/v1/badges/user/:userId',
    auth: { kind: 'public' },
    params: ListForUserParams,
    openapi: {
      summary: 'Public list of badges for a given user.',
      tags: ['badges'],
      description: 'User achievement badges',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { userId } = ctx.params as { userId: string };
      const badges = await bc.listUserBadges.execute(userId);
      return { badges };
    },
  },
];
