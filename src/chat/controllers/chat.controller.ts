import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';
import { createZodPipe } from '../../common/validation/zod-validation.pipe';
import {
  SendMessageSchema,
  SendMessageToConversationSchema,
  GetMessagesQuerySchema,
  GetConversationsQuerySchema,
} from '@octopus-synapse/profile-contracts';
import type { AuthenticatedRequest } from '../../auth/interfaces/auth-request.interface';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a user' })
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Body(createZodPipe(SendMessageSchema))
    dto: ReturnType<typeof SendMessageSchema.parse>,
  ) {
    return this.chatService.sendMessage(req.user.userId, dto);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message to an existing conversation' })
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
  async getConversations(
    @Req() req: AuthenticatedRequest,
    @Query(createZodPipe(GetConversationsQuerySchema))
    query: ReturnType<typeof GetConversationsQuerySchema.parse>,
  ) {
    return this.chatService.getConversations(req.user.userId, query);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get a single conversation' })
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.getConversation(req.user.userId, conversationId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
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
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  @Get('conversation-with/:userId')
  @ApiOperation({ summary: 'Get or create conversation with a user' })
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
