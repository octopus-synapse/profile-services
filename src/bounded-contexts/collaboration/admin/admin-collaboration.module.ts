import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AdminChatController } from './admin-chat.controller';
import { AdminChatService } from './admin-chat.service';
import { AdminCollaborationController } from './admin-collaboration.controller';
import { AdminCollaborationService } from './admin-collaboration.service';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [AdminChatController, AdminCollaborationController],
  providers: [AdminChatService, AdminCollaborationService],
})
export class AdminCollaborationModule {}
