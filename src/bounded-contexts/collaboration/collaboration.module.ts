/**
 * Collaboration Module - ADR-002: Modular Hexagonal Architecture
 *
 * Submodules: Chat, Collaboration (resume sharing)
 */

import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ResumeSharingModule } from './sharing/collaboration.module';

@Module({
  imports: [ChatModule, ResumeSharingModule],
  exports: [ChatModule, ResumeSharingModule],
})
export class CollaborationModule {}
