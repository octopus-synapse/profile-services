/**
 * Pure-TS wiring for the collaboration BC. Zero `@nestjs/*` imports.
 *
 * The collaboration BC has four slices that historically each owned a
 * Nest module: chat, chat-block, resume-sharing, and admin. They share
 * the bounded-context name; we aggregate them here into a single
 * framework-free composition that the Nest module shells consume via
 * `useFactory`.
 *
 * The bundle exposed by this composition combines all per-slice route
 * groups under separate keys so the router-synthesizer can keep its
 * one-token-per-routes invariant. Each slice's module shell remains as
 * the Nest-side bridge for that route group; this file is the single
 * source of truth for instantiating the POJOs.
 *
 * Realtime (Socket.IO) wiring is intentionally NOT performed here —
 * `WebSocketPort` consumption is a follow-up; we expose the handler
 * registration as `registerChatRealtime(deps)` for the Elysia bootstrap
 * to call once it owns the ws port.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { JwtPort, LoggerPort } from '@/shared-kernel';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import type { Route } from '@/shared-kernel/http/route.types';
import type { WebSocketPort } from '@/shared-kernel/websocket/websocket.port';

// admin slice
import {
  AdminCollaborationUseCases,
  buildAdminCollaborationUseCases,
} from './admin/admin-collaboration.composition';
import { adminCollaborationRoutes } from './admin/admin-collaboration.routes';
// chat block slice
import { buildBlockUseCases } from './chat/application/block.composition';
// chat slice
import { buildChatUseCases } from './chat/application/chat.composition';
import { BlockUseCases } from './chat/application/ports/block.port';
import { ChatUseCases } from './chat/application/ports/chat.port';
import { ChatHttpBundle, chatRoutes } from './chat/chat.routes';
import { type ChatRealtimePort, registerChatWebSocketHandlers } from './chat/gateways';
import {
  BlockedUserRepository,
  ConversationRepository,
  MessageRepository,
} from './chat/repositories';
import { ChatCacheService } from './chat/services';
import { ChatPreferenceService } from './chat/services/chat-preference.service';
import { ChatUserSearchService } from './chat/services/user-search.service';
// sharing slice
import {
  buildCollaborationUseCases,
  CollaborationUseCases,
} from './sharing/application/collaboration.composition';
import { CollaborationHttpBundle, collaborationRoutes } from './sharing/collaboration.routes';
import { PrismaCollaborationRepository } from './sharing/infrastructure/adapters/collaboration.repository';
import { CollabCommentService } from './sharing/services/collab-comment.service';

export {
  AdminCollaborationUseCases,
  BlockUseCases,
  buildAdminCollaborationUseCases,
  buildBlockUseCases,
  buildChatUseCases,
  buildCollaborationUseCases,
  ChatUseCases,
  CollaborationUseCases,
};

/**
 * Aggregated bundle for the collaboration BC. Each per-slice route
 * group still consumes its own bundle token (`ChatHttpBundle`,
 * `CollaborationHttpBundle`, `AdminCollaborationUseCases`) — those are
 * preserved as separate keys here so route synthesis stays compatible.
 */
export interface CollaborationBundle {
  readonly chat: ChatHttpBundle;
  readonly sharing: CollaborationHttpBundle;
  readonly admin: AdminCollaborationUseCases;
  /**
   * Internal singletons exposed for the optional realtime registration.
   * Module shells use this to wire the Socket.IO gateway; the Elysia
   * bootstrap calls `registerChatRealtime(...)` once it owns the
   * `WebSocketPort`.
   */
  readonly chatInternals: {
    readonly chat: ChatUseCases;
    readonly conversationRepo: ConversationRepository;
    readonly chatCache: ChatCacheService;
  };
}

export interface CollaborationComposition extends BoundedContextComposition<CollaborationBundle> {
  readonly useCases: CollaborationBundle;
  /**
   * Register the chat WebSocket handlers against the supplied
   * `WebSocketPort`. Idempotent — call once at boot. Returns the
   * `ChatRealtimePort` other BCs depend on for presence + targeted
   * notifications (kept identical to the old `ChatGateway` surface).
   */
  readonly registerChatRealtime: (deps: { ws: WebSocketPort; jwt: JwtPort }) => ChatRealtimePort;
}

export interface CollaborationCompositionDeps {
  readonly prisma: PrismaService;
  readonly cache: CachePort;
  readonly eventPublisher: EventPublisherPort;
  readonly logger: LoggerPort;
}

export function buildCollaborationComposition(
  deps: CollaborationCompositionDeps,
): CollaborationComposition {
  const { prisma, cache, eventPublisher, logger } = deps;

  // ─── chat slice ─────────────────────────────────────────────────────
  const conversationRepo = new ConversationRepository(prisma, logger);
  const messageRepo = new MessageRepository(prisma);
  const blockedUserRepo = new BlockedUserRepository(prisma);
  const chatCache = new ChatCacheService(cache);
  const chatPreference = new ChatPreferenceService(prisma);
  const chatUserSearch = new ChatUserSearchService(prisma);

  const chatUseCases = buildChatUseCases(
    conversationRepo,
    messageRepo,
    blockedUserRepo,
    eventPublisher,
    chatCache,
    logger,
  );
  const blockUseCases = buildBlockUseCases(blockedUserRepo);

  const chatBundle: ChatHttpBundle = {
    chat: chatUseCases,
    block: blockUseCases,
    preferences: chatPreference,
    search: chatUserSearch,
  };

  // ─── sharing slice ──────────────────────────────────────────────────
  const sharingRepo = new PrismaCollaborationRepository(prisma);
  const sharingUseCases = buildCollaborationUseCases(sharingRepo, eventPublisher, logger);
  const collabComments = new CollabCommentService(prisma);
  const sharingBundle: CollaborationHttpBundle = {
    collaboration: sharingUseCases,
    comments: collabComments,
  };

  // ─── admin slice ────────────────────────────────────────────────────
  const adminUseCases = buildAdminCollaborationUseCases(prisma);

  const useCases: CollaborationBundle = {
    chat: chatBundle,
    sharing: sharingBundle,
    admin: adminUseCases,
    chatInternals: {
      chat: chatUseCases,
      conversationRepo,
      chatCache,
    },
  };

  return {
    useCases,
    routes: [
      // The aggregated bundle exposes the slice bundles under typed
      // sub-keys; the router-synthesizer wants flat `Route<TBundle>[]`
      // descriptors. We keep the per-slice routes' original bundle
      // shapes by re-binding handlers to read the slice off the
      // aggregated bundle. That keeps the per-slice routes files /
      // tests untouched.
      ...chatRoutes.map((r) => rebindHandlerForSlice<ChatHttpBundle>(r, (b) => b.chat)),
      ...collaborationRoutes.map((r) =>
        rebindHandlerForSlice<CollaborationHttpBundle>(r, (b) => b.sharing),
      ),
      ...adminCollaborationRoutes.map((r) =>
        rebindHandlerForSlice<AdminCollaborationUseCases>(r, (b) => b.admin),
      ),
    ],
    registerChatRealtime: ({ ws, jwt }) =>
      registerChatWebSocketHandlers({
        ws,
        jwt,
        chat: chatUseCases,
        conversationRepo,
        chatCache,
        logger,
        // P1 #7 — thread the shared CachePort through so the WS
        // handshake honours the same `token_valid_after` invalidation
        // gate the HTTP pipeline uses (JoseAuthExtractorAdapter).
        cache,
      }),
  };
}

/**
 * Rebind a `Route<TSlice>` to `Route<CollaborationBundle>` by projecting
 * the slice out of the aggregated bundle before delegating. The
 * handler signature is the only `TBundle`-dependent field on `Route`;
 * everything else is bundle-agnostic so a structural cast is safe.
 */
function rebindHandlerForSlice<TSlice>(
  route: Route<TSlice>,
  pick: (b: CollaborationBundle) => TSlice,
): Route<CollaborationBundle> {
  const original = route.handler;
  return {
    ...route,
    handler: ((ctx, b) => original(ctx, pick(b))) as Route<CollaborationBundle>['handler'],
  } as Route<CollaborationBundle>;
}
