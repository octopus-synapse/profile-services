import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Controllers
import { ChatController, BlockController } from './controllers';

// Services
import { ChatService, BlockService } from './services';

// Repositories
import {
  ConversationRepository,
  MessageRepository,
  BlockedUserRepository,
} from './repositories';

// Gateways
import { ChatGateway } from './gateways';

// Shared modules
import { PrismaModule } from '../prisma/prisma.module';

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
