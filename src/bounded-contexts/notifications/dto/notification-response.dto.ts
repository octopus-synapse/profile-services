/**
 * Notification Response DTOs
 *
 * Data Transfer Objects for notification API responses.
 * Used by Swagger decorators to document response bodies.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Nested DTOs
// ============================================================================

class NotificationActorDto {
  @ApiProperty({ example: 'user-456' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'janedoe', nullable: true })
  username!: string | null;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true })
  photoURL!: string | null;
}

class NotificationDto {
  @ApiProperty({ example: 'notif-123' })
  id!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiProperty({ example: 'LIKE' })
  type!: string;

  @ApiProperty({ example: 'user-456' })
  actorId!: string;

  @ApiProperty({ example: 'Jane liked your post' })
  message!: string;

  @ApiPropertyOptional({ example: 'POST' })
  entityType?: string;

  @ApiPropertyOptional({ example: 'post-123' })
  entityId?: string;

  @ApiProperty({ example: false })
  read!: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty()
  actor!: NotificationActorDto;
}

// ============================================================================
// Response DTOs
// ============================================================================

export class NotificationsListDataDto {
  @ApiProperty({ type: [NotificationDto] })
  data!: NotificationDto[];

  @ApiProperty({ example: 'notif-456', nullable: true })
  nextCursor!: string | null;
}

export class UnreadCountDataDto {
  @ApiProperty({ example: 5 })
  count!: number;
}

export class MarkReadDataDto {
  @ApiProperty({ example: 3 })
  count!: number;
}
