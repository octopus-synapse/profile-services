import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ChatMessageResponseDto,
  ConversationDetailResponseDto,
  ConversationResponseDto,
  MarkAsReadResponseDto,
  UnreadCountResponseDto,
} from '@/shared-kernel/dtos/sdk-response.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import {
  SendMessageSchema,
  SendMessageToConversationSchema,
  GetMessagesQuerySchema,
  GetConversationsQuerySchema,
} from '@/shared-kernel';
import type { AuthenticatedRequest } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { ApiResponse } from '@nestjs/swagger';

@SdkExport({ tag: 'chat', description: 'Chat API' })
@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a user' })
  @ApiResponse({ status: 201, type: ChatMessageResponseDto })
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Body(createZodPipe(SendMessageSchema))
    dto: ReturnType<typeof SendMessageSchema.parse>,
  ) {
    return this.chatService.sendMessage(req.user.userId, dto);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message to an existing conversation' })
  @ApiResponse({ status: 201, type: ChatMessageResponseDto })
  async sendMessageToConversation(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body(
      createZodPipe(SendMessageToConversationSchema.pick({ content: true })),
    )
    dto: { content: string },
  ) {
    return this.chatService.sendMessageToConversation(
      req.user.userId,
      conversationId,
      dto.content,
    );
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  async getConversations(
    @Req() req: AuthenticatedRequest,
    @Query(createZodPipe(GetConversationsQuerySchema))
    query: ReturnType<typeof GetConversationsQuerySchema.parse>,
  ) {
    return this.chatService.getConversations(req.user.userId, query);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get a single conversation' })
  @ApiResponse({ status: 200, type: ConversationDetailResponseDto })
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.getConversation(req.user.userId, conversationId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, type: [ChatMessageResponseDto] })
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query() query: { cursor?: string; limit?: string },
  ) {
    const parsedQuery = GetMessagesQuerySchema.parse({
      conversationId,
      cursor: query.cursor,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    });
    return this.chatService.getMessages(req.user.userId, parsedQuery);
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiResponse({ status: 201, type: MarkAsReadResponseDto })
  async markConversationAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.markConversationAsRead(
      req.user.userId,
      conversationId,
    );
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  @Get('conversation-with/:userId')
  @ApiOperation({ summary: 'Get or create conversation with a user' })
  @ApiResponse({ status: 200, type: ConversationDetailResponseDto })
  async getConversationWith(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const conversationId = await this.chatService.getConversationId(
      req.user.userId,
      userId,
    );
    if (!conversationId) {
      return { conversationId: null };
    }
    return this.chatService.getConversation(req.user.userId, conversationId);
  }
}
