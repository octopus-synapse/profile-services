import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ZodValidationPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { CHAT_USE_CASES, type ChatUseCases } from '../application/ports/chat.port';
import {
  GetConversationsQueryDto,
  GetConversationsQuerySchema,
  GetMessagesQueryDto,
  GetMessagesQuerySchema,
  SendMessageDto,
  SendMessageToConversationDto,
} from '../dto/chat-request.dto';
import {
  ChatMessageDataDto,
  ConversationDataDto,
  ConversationNullableDataDto,
  ConversationsListDataDto,
  MarkAsReadDataDto,
  MessagesListDataDto,
  UnreadCountDataDto,
} from '../dto/chat-response.dto';

@SdkExport({ tag: 'chat', description: 'Chat API' })
@ApiTags('Chat')
@ApiBearerAuth()
@RequirePermission(Permission.CHAT_USE)
@Controller('chat')
export class ChatController {
  constructor(@Inject(CHAT_USE_CASES) private readonly chat: ChatUseCases) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a user' })
  @ApiDataResponse(ChatMessageDataDto, {
    status: 201,
    description: 'Message sent',
  })
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SendMessageDto,
  ): Promise<DataResponse<ChatMessageDataDto>> {
    const message = await this.chat.sendMessageUseCase.execute(req.user.userId, dto);
    return { success: true, data: { message } };
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message to an existing conversation' })
  @ApiParam({ name: 'conversationId', type: 'string' })
  @ApiDataResponse(ChatMessageDataDto, {
    status: 201,
    description: 'Message sent',
  })
  async sendMessageToConversation(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageToConversationDto,
  ): Promise<DataResponse<ChatMessageDataDto>> {
    const message = await this.chat.sendMessageToConversationUseCase.execute(
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
    @Query(new ZodValidationPipe(GetConversationsQuerySchema)) query: GetConversationsQueryDto,
  ): Promise<DataResponse<ConversationsListDataDto>> {
    const conversations = await this.chat.getConversationsUseCase.execute(req.user.userId, query);
    return { success: true, data: { conversations } };
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get a single conversation' })
  @ApiParam({ name: 'conversationId', type: 'string' })
  @ApiDataResponse(ConversationDataDto, { description: 'Conversation details' })
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ): Promise<DataResponse<ConversationDataDto>> {
    const conversation = await this.chat.getConversationUseCase.execute(
      req.user.userId,
      conversationId,
    );
    return { success: true, data: { conversation } };
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'conversationId', type: 'string' })
  @ApiDataResponse(MessagesListDataDto, { description: 'List of messages' })
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query(new ZodValidationPipe(GetMessagesQuerySchema)) query: GetMessagesQueryDto,
  ): Promise<DataResponse<MessagesListDataDto>> {
    const messages = await this.chat.getMessagesUseCase.execute(req.user.userId, {
      conversationId,
      cursor: query.cursor,
      limit: query.limit ?? 50,
    });
    return { success: true, data: { messages } };
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiParam({ name: 'conversationId', type: 'string' })
  @ApiDataResponse(MarkAsReadDataDto, {
    status: 201,
    description: 'Messages marked as read',
  })
  async markConversationAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ): Promise<DataResponse<MarkAsReadDataDto>> {
    const result = await this.chat.markConversationReadUseCase.execute(
      req.user.userId,
      conversationId,
    );
    return { success: true, data: { count: result.count } };
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiDataResponse(UnreadCountDataDto, { description: 'Unread message count' })
  async getUnreadCount(
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<UnreadCountDataDto>> {
    const unread = await this.chat.getUnreadCountUseCase.execute(req.user.userId);
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
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(ConversationNullableDataDto, {
    description: 'Conversation with user',
  })
  async getConversationWith(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ): Promise<DataResponse<ConversationNullableDataDto>> {
    const conversationId = await this.chat.getConversationIdUseCase.execute(
      req.user.userId,
      userId,
    );
    if (!conversationId) {
      return { success: true, data: { conversationId: null } };
    }
    const conversation = await this.chat.getConversationUseCase.execute(
      req.user.userId,
      conversationId,
    );
    return { success: true, data: { conversationId, conversation } };
  }
}
