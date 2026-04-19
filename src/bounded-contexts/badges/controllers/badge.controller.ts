import { Controller, Get, HttpCode, HttpStatus, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { BadgeService } from '../services/badge.service';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

type BadgeEntry = {
  kind: string;
  awardedAt: string;
};

@SdkExport({ tag: 'badges', description: 'User achievement badges' })
@ApiTags('badges')
@Controller('v1/badges')
export class BadgeController {
  constructor(private readonly badges: BadgeService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Badges awarded to the viewer.' })
  async listMine(@Req() req: RequestWithUser): Promise<DataResponse<{ badges: BadgeEntry[] }>> {
    const badges = await this.badges.listForUserAsDto(req.user.userId);
    return { success: true, data: { badges } };
  }

  @Public()
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public list of badges for a given user.' })
  @ApiParam({ name: 'userId', type: 'string' })
  async listForUser(
    @Param('userId') userId: string,
  ): Promise<DataResponse<{ badges: BadgeEntry[] }>> {
    const badges = await this.badges.listForUserAsDto(userId);
    return { success: true, data: { badges } };
  }
}
