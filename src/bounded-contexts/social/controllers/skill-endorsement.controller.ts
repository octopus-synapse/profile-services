/**
 * Skill Endorsement Controller
 *
 * - GET    /v1/users/:userId/skills                         — skills + counts
 * - POST   /v1/users/:userId/skills/:skill/endorse          — endorse
 * - DELETE /v1/users/:userId/skills/:skill/endorse          — withdraw
 * - GET    /v1/users/:userId/skills/:skill/endorsers        — list endorsers
 */

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { SkillEndorsementService } from '../services/skill-endorsement.service';

@SdkExport({ tag: 'skill-endorsements', description: 'Skill endorsements API', requiresAuth: true })
@ApiTags('skill-endorsements')
@ApiBearerAuth()
@RequirePermission(Permission.SOCIAL_USE)
@Controller('v1/users')
export class SkillEndorsementController {
  constructor(private readonly service: SkillEndorsementService) {}

  @Get(':userId/skills')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List a user’s skills with endorsement counts' })
  @ApiParam({ name: 'userId', type: 'string' })
  async getSkills(@Param('userId') userId: string, @Req() req: { user: { userId: string } }) {
    const skills = await this.service.getUserSkills(userId, req.user.userId);
    return { skills };
  }

  @Post(':userId/skills/:skill/endorse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endorse a user for a skill' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiParam({ name: 'skill', type: 'string' })
  async endorse(
    @Param('userId') userId: string,
    @Param('skill') skill: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.endorse(userId, decodeURIComponent(skill), req.user.userId);
  }

  @Delete(':userId/skills/:skill/endorse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a previously given endorsement' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiParam({ name: 'skill', type: 'string' })
  async withdraw(
    @Param('userId') userId: string,
    @Param('skill') skill: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.withdraw(userId, decodeURIComponent(skill), req.user.userId);
  }

  @Get(':userId/skills/:skill/endorsers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List endorsers for a specific skill' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiParam({ name: 'skill', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEndorsers(
    @Param('userId') userId: string,
    @Param('skill') skill: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getEndorsers(
      userId,
      decodeURIComponent(skill),
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }
}
