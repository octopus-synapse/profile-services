/**
 * Collaboration Module - ADR-002: Modular Hexagonal Architecture
 *
 * Submodules: Chat, Collaboration (resume sharing)
 */

import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { CollaborationModule as ResumeSharingModule } from './collaboration/collaboration.module';

@Module({
  imports: [ChatModule, ResumeSharingModule],
  exports: [ChatModule, ResumeSharingModule],
})
export class CollaborationModule {}
