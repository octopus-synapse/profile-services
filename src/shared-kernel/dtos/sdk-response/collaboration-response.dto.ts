/**
 * Collaboration & Chat SDK Response DTOs
 *
 * Response types for collaborators, shared resumes, conversations, and blocking.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CollaboratorResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'clxxx...' })
  userId!: string;

  @ApiProperty({ example: 'clxxx...' })
  resumeId!: string;

  @ApiProperty({ example: 'EDITOR', enum: ['VIEWER', 'EDITOR', 'ADMIN'] })
  role!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class SharedResumeResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  resumeId!: string;

  @ApiProperty({ example: 'My Resume' })
  resumeTitle!: string;

  @ApiProperty({ example: 'clxxx...' })
  ownerId!: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  ownerName?: string;

  @ApiProperty({ example: 'VIEWER', enum: ['VIEWER', 'EDITOR', 'ADMIN'] })
  role!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  sharedAt!: string;
}

export class ChatMessageResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'clxxx...' })
  conversationId!: string;

  @ApiProperty({ example: 'clxxx...' })
  senderId!: string;

  @ApiProperty({ example: 'Hello, how are you?' })
  content!: string;

  @ApiProperty({ example: false })
  read!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class ConversationResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'clxxx...' })
  participantId!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  participantName?: string;

  @ApiPropertyOptional({ example: 'Last message preview...' })
  lastMessage?: string;

  @ApiProperty({ example: 2 })
  unreadCount!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class ConversationDetailResponseDto extends ConversationResponseDto {
  @ApiProperty({ type: [ChatMessageResponseDto] })
  messages!: ChatMessageResponseDto[];
}

export class MarkAsReadResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 5 })
  messagesMarked!: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count!: number;
}

export class BlockUserResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'clxxx...' })
  blockedUserId!: string;
}

export class BlockedUserResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  userId!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  blockedAt!: string;
}

export class IsBlockedResponseDto {
  @ApiProperty({ example: false })
  isBlocked!: boolean;
}
