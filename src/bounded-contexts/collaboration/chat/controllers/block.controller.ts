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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { type BlockedUserResponse, BlockUserRequestDto, BlockUserSchema } from '@/shared-kernel';
import { BlockService } from '../services/block.service';

// Wrapper DTOs for responses
export class BlockUserDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  block!: BlockedUserResponse;
}

export class BlockedUsersListDataDto {
  @ApiProperty({ description: 'List of blocked users' })
  blockedUsers!: BlockedUserResponse[];
}

export class IsBlockedDataDto {
  @ApiProperty({ description: 'Block status' })
  isBlocked!: boolean;
}

@SdkExport({ tag: 'chat---block-users', description: 'Chat Block Users API' })
@ApiTags('Chat - Block Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat/blocked')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post()
  @ApiOperation({ summary: 'Block a user' })
  @ApiBody({ type: BlockUserRequestDto })
  @ApiDataResponse(BlockUserDataDto, {
    status: 201,
    description: 'User blocked',
  })
  async blockUser(
    @Req() req: AuthenticatedRequest,
    @Body(createZodPipe(BlockUserSchema))
    dto: ReturnType<typeof BlockUserSchema.parse>,
  ): Promise<DataResponse<BlockUserDataDto>> {
    const block = await this.blockService.blockUser(req.user.userId, dto);
    return { success: true, data: { block } };
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiEmptyDataResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User unblocked',
  })
  async unblockUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.blockService.unblockUser(req.user.userId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all blocked users' })
  @ApiDataResponse(BlockedUsersListDataDto, {
    description: 'List of blocked users',
  })
  async getBlockedUsers(
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<BlockedUsersListDataDto>> {
    const blockedUsers = await this.blockService.getBlockedUsers(req.user.userId);
    return { success: true, data: { blockedUsers } };
  }

  @Get(':userId/status')
  @ApiOperation({ summary: 'Check if a user is blocked' })
  @ApiDataResponse(IsBlockedDataDto, { description: 'Block status' })
  async isBlocked(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ): Promise<DataResponse<IsBlockedDataDto>> {
    const result = await this.blockService.isBlocked(req.user.userId, userId);
    return { success: true, data: { isBlocked: result } };
  }
}
