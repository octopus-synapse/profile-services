import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import {
  type ConversationResponse,
  GetConversationsQuerySchema,
  GetMessagesQuerySchema,
  type MessageResponse,
  type PaginatedConversationsResponse,
  type PaginatedMessagesResponse,
  SendMessageSchema,
  SendMessageToConversationSchema,
} from '@/shared-kernel';
import { ChatService } from '../services/chat.service';

// Wrapper DTOs for responses
export class ChatMessageDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  message!: MessageResponse;
}

export class ConversationsListDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  conversations!: PaginatedConversationsResponse;
}

export class ConversationDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  conversation!: ConversationResponse;
}

export class MessagesListDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  messages!: PaginatedMessagesResponse;
}

export class MarkAsReadDataDto {
  @ApiProperty({ description: 'Number of messages marked as read' })
  count!: number;
}

export class UnreadCountDataDto {
  @ApiProperty({ description: 'Total unread messages' })
  totalUnread!: number;

  @ApiProperty({ description: 'Unread count by conversation ID' })
  byConversation!: Record<string, number>;
}

export class ConversationNullableDataDto {
  @ApiProperty({ type: String, nullable: true })
  conversationId!: string | null;

  @ApiProperty({ nullable: true, description: 'Conversation details' })
  conversation?: ConversationResponse | null;
}

@SdkExport({ tag: 'chat', description: 'Chat API' })
@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a user' })
  @ApiDataResponse(ChatMessageDataDto, {
    status: 201,
    description: 'Message sent',
  })
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Body(createZodPipe(SendMessageSchema))
    dto: ReturnType<typeof SendMessageSchema.parse>,
  ): Promise<DataResponse<ChatMessageDataDto>> {
    const message = await this.chatService.sendMessage(req.user.userId, dto);
    return { success: true, data: { message } };
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message to an existing conversation' })
  @ApiDataResponse(ChatMessageDataDto, {
    status: 201,
    description: 'Message sent',
  })
  async sendMessageToConversation(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body(createZodPipe(SendMessageToConversationSchema.pick({ content: true })))
    dto: { content: string },
  ): Promise<DataResponse<ChatMessageDataDto>> {
    const message = await this.chatService.sendMessageToConversation(
      req.user.userId,
      conversationId,
      dto.content,
    );
    return { success: true, data: { message } };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiDataResponse(ConversationsListDataDto, {
    description: 'List of conversations',
  })
  async getConversations(
    @Req() req: AuthenticatedRequest,
    @Query(createZodPipe(GetConversationsQuerySchema))
    query: ReturnType<typeof GetConversationsQuerySchema.parse>,
  ): Promise<DataResponse<ConversationsListDataDto>> {
    const conversations = await this.chatService.getConversations(req.user.userId, query);
    return { success: true, data: { conversations } };
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get a single conversation' })
  @ApiDataResponse(ConversationDataDto, { description: 'Conversation details' })
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ): Promise<DataResponse<ConversationDataDto>> {
    const conversation = await this.chatService.getConversation(req.user.userId, conversationId);
    return { success: true, data: { conversation } };
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiDataResponse(MessagesListDataDto, { description: 'List of messages' })
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query() query: { cursor?: string; limit?: string },
  ): Promise<DataResponse<MessagesListDataDto>> {
    const parsedQuery = GetMessagesQuerySchema.parse({
      conversationId,
      cursor: query.cursor,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    });
    const messages = await this.chatService.getMessages(req.user.userId, parsedQuery);
    return { success: true, data: { messages } };
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiDataResponse(MarkAsReadDataDto, {
    status: 201,
    description: 'Messages marked as read',
  })
  async markConversationAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ): Promise<DataResponse<MarkAsReadDataDto>> {
    const result = await this.chatService.markConversationAsRead(req.user.userId, conversationId);
    return { success: true, data: { count: result.count } };
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiDataResponse(UnreadCountDataDto, { description: 'Unread message count' })
  async getUnreadCount(
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<UnreadCountDataDto>> {
    const unread = await this.chatService.getUnreadCount(req.user.userId);
    return {
      success: true,
      data: {
        totalUnread: unread.totalUnread,
        byConversation: unread.byConversation,
      },
    };
  }

  @Get('conversation-with/:userId')
  @ApiOperation({ summary: 'Get or create conversation with a user' })
  @ApiDataResponse(ConversationNullableDataDto, {
    description: 'Conversation with user',
  })
  async getConversationWith(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ): Promise<DataResponse<ConversationNullableDataDto>> {
    const conversationId = await this.chatService.getConversationId(req.user.userId, userId);
    if (!conversationId) {
      return { success: true, data: { conversationId: null } };
    }
    const conversation = await this.chatService.getConversation(req.user.userId, conversationId);
    return { success: true, data: { conversationId, conversation } };
  }
}
