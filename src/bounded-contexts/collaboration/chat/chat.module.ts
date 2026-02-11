import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
// Shared modules
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
// Controllers
import { BlockController, ChatController } from './controllers';
// Gateways
import { ChatGateway } from './gateways';
// Repositories
import { BlockedUserRepository, ConversationRepository, MessageRepository } from './repositories';
// Services
import { BlockService, ChatService } from './services';

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
  controllers: [ChatController, BlockController],
  providers: [
    // Services
    ChatService,
    BlockService,

    // Repositories
    ConversationRepository,
    MessageRepository,
    BlockedUserRepository,

    // Gateways
    ChatGateway,
  ],
  exports: [ChatService, BlockService, ChatGateway],
})
export class ChatModule {}
