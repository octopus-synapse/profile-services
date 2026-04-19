import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { EventPublisher } from '@/shared-kernel';
import { BLOCK_USE_CASES, buildBlockUseCases } from './application/block.composition';
import { buildChatUseCases, CHAT_USE_CASES } from './application/chat.composition';
import { BlockController, ChatController } from './controllers';
import { ChatPreferenceController } from './controllers/chat-preference.controller';
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
  controllers: [ChatController, BlockController, ChatPreferenceController],
  providers: [
    // Infrastructure
    ChatCacheService,
    ChatPreferenceService,
    ChatUserSearchService,
    ConversationRepository,
    MessageRepository,
    BlockedUserRepository,

    // Use-case compositions
    {
      provide: CHAT_USE_CASES,
      useFactory: buildChatUseCases,
      inject: [
        ConversationRepository,
        MessageRepository,
        BlockedUserRepository,
        EventPublisher,
        ChatCacheService,
      ],
    },
    {
      provide: BLOCK_USE_CASES,
      useFactory: buildBlockUseCases,
      inject: [BlockedUserRepository],
    },

    // Gateway
    ChatGateway,
  ],
  exports: [CHAT_USE_CASES, BLOCK_USE_CASES, ChatGateway],
})
export class ChatModule {}
