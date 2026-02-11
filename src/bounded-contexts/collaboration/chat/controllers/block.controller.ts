import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { BlockUserSchema } from '@/shared-kernel';
import {
  BlockedUserResponseDto,
  BlockUserResponseDto,
  DeleteResponseDto,
  IsBlockedResponseDto,
} from '@/shared-kernel/dtos/sdk-response.dto';
import { BlockService } from '../services/block.service';

@SdkExport({ tag: 'chat---block-users', description: 'Chat Block Users API' })
@ApiTags('Chat - Block Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat/blocked')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post()
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, type: BlockUserResponseDto })
  async blockUser(
    @Req() req: AuthenticatedRequest,
    @Body(createZodPipe(BlockUserSchema))
    dto: ReturnType<typeof BlockUserSchema.parse>,
  ) {
    return this.blockService.blockUser(req.user.userId, dto);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, type: DeleteResponseDto })
  async unblockUser(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    await this.blockService.unblockUser(req.user.userId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all blocked users' })
  @ApiResponse({ status: 200, type: [BlockedUserResponseDto] })
  async getBlockedUsers(@Req() req: AuthenticatedRequest) {
    return this.blockService.getBlockedUsers(req.user.userId);
  }

  @Get(':userId/status')
  @ApiOperation({ summary: 'Check if a user is blocked' })
  @ApiResponse({ status: 200, type: IsBlockedResponseDto })
  async isBlocked(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    const isBlocked = await this.blockService.isBlocked(req.user.userId, userId);
    return { isBlocked };
  }
}
