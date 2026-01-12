import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BlockService } from '../services/block.service';
import { createZodPipe } from '../../common/validation/zod-validation.pipe';
import { BlockUserSchema } from '@octopus-synapse/profile-contracts';
import type { AuthenticatedRequest } from '../../auth/interfaces/auth-request.interface';

@ApiTags('Chat - Block Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat/blocked')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post()
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(
    @Req() req: AuthenticatedRequest,
    @Body(createZodPipe(BlockUserSchema)) dto: ReturnType<typeof BlockUserSchema.parse>,
  ) {
    return this.blockService.blockUser(req.user.userId, dto);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    await this.blockService.unblockUser(req.user.userId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all blocked users' })
  async getBlockedUsers(@Req() req: AuthenticatedRequest) {
    return this.blockService.getBlockedUsers(req.user.userId);
  }

  @Get(':userId/status')
  @ApiOperation({ summary: 'Check if a user is blocked' })
  async isBlocked(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const isBlocked = await this.blockService.isBlocked(req.user.userId, userId);
    return { isBlocked };
  }
}
