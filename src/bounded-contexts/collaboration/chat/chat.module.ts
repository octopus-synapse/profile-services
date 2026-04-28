import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { NestJwtAdapter } from '@/infrastructure/nest-adapter/nest-jwt.adapter';
import { EventPublisher, JwtPort, LoggerPort } from '@/shared-kernel';
import { WebSocketPort } from '@/shared-kernel/websocket/websocket.port';
import { buildBlockUseCases } from './application/block.composition';
import { buildChatUseCases } from './application/chat.composition';
import { BlockUseCases } from './application/ports/block.port';
import { ChatUseCases } from './application/ports/chat.port';
import { ChatHttpBundle, chatRoutes } from './chat.routes';
import { type ChatRealtimePort, registerChatWebSocketHandlers } from './gateways';
import { BlockedUserRepository, ConversationRepository, MessageRepository } from './repositories';
import { ChatCacheService } from './services';
import { ChatPreferenceService } from './services/chat-preference.service';
import { ChatUserSearchService } from './services/user-search.service';

/** DI token for the chat realtime surface (presence + targeted notify). */
export const CHAT_REALTIME = Symbol('CHAT_REALTIME');

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: synthesizeRouteControllers(ChatHttpBundle, chatRoutes),
  providers: [
    {
      provide: JwtPort,
      useFactory: (jwt: JwtService) => new NestJwtAdapter(jwt),
      inject: [JwtService],
    },
    // Infrastructure
    ChatCacheService,
    ChatPreferenceService,
    ChatUserSearchService,
    ConversationRepository,
    MessageRepository,
    BlockedUserRepository,

    // Use-case compositions
    {
      provide: ChatUseCases,
      useFactory: buildChatUseCases,
      inject: [
        ConversationRepository,
        MessageRepository,
        BlockedUserRepository,
        EventPublisher,
        ChatCacheService,
        LoggerPort,
      ],
    },
    { provide: BlockUseCases, useFactory: buildBlockUseCases, inject: [BlockedUserRepository] },

    // Aggregated HTTP bundle consumed by synthesized route controllers.
    {
      provide: ChatHttpBundle,
      useFactory: (
        chat: ChatUseCases,
        block: BlockUseCases,
        preferences: ChatPreferenceService,
        search: ChatUserSearchService,
      ): ChatHttpBundle => ({ chat, block, preferences, search }),
      inject: [ChatUseCases, BlockUseCases, ChatPreferenceService, ChatUserSearchService],
    },

    // Realtime — registers chat handlers against the framework-free
    // `WebSocketPort`. Lives in the Nest adapter; here we just request
    // it eagerly so the namespace gets wired at boot.
    {
      provide: CHAT_REALTIME,
      useFactory: (
        ws: WebSocketPort,
        jwt: JwtPort,
        chat: ChatUseCases,
        conversationRepo: ConversationRepository,
        chatCache: ChatCacheService,
        logger: LoggerPort,
      ): ChatRealtimePort =>
        registerChatWebSocketHandlers({ ws, jwt, chat, conversationRepo, chatCache, logger }),
      inject: [
        WebSocketPort,
        JwtPort,
        ChatUseCases,
        ConversationRepository,
        ChatCacheService,
        LoggerPort,
      ],
    },
  ],
  exports: [ChatUseCases, BlockUseCases, CHAT_REALTIME],
})
export class ChatModule {}
