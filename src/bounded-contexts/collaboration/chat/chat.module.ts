import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { NestJwtAdapter } from '@/infrastructure/nest-adapter/nest-jwt.adapter';
import { EventPublisher, JwtPort, LoggerPort } from '@/shared-kernel';
import { buildBlockUseCases } from './application/block.composition';
import { buildChatUseCases } from './application/chat.composition';
import { BlockUseCases } from './application/ports/block.port';
import { ChatUseCases } from './application/ports/chat.port';
import { ChatHttpBundle, chatRoutes } from './chat.routes';
import { ChatGateway } from './gateways';
import { BlockedUserRepository, ConversationRepository, MessageRepository } from './repositories';
import { ChatCacheService } from './services';
import { ChatPreferenceService } from './services/chat-preference.service';
import { ChatUserSearchService } from './services/user-search.service';

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

    // Gateway
    ChatGateway,
  ],
  exports: [ChatUseCases, BlockUseCases, ChatGateway],
})
export class ChatModule {}
