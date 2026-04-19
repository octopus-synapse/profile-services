import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthenticatedRequest } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { SkillProficiencyService } from './services/skill-proficiency.service';

const SetProficiencySchema = z.object({
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
});
export class SetProficiencyDto extends createZodDto(SetProficiencySchema) {}

@SdkExport({ tag: 'skills', description: 'Self-declared skill proficiency' })
@ApiTags('Skills')
@ApiBearerAuth()
@RequirePermission(Permission.USER_PROFILE_UPDATE)
@Controller('v1/me/skill-proficiency')
export class SkillProficiencyController {
  constructor(private readonly service: SkillProficiencyService) {}

  @Get()
  @ApiOperation({ summary: 'List my declared skill proficiencies.' })
  async list(
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<{ proficiencies: unknown[] }>> {
    const proficiencies = await this.service.listForUser(req.user.userId);
    return { success: true, data: { proficiencies } };
  }

  @Put(':skillName')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set proficiency for a skill (creates if missing).' })
  @ApiParam({ name: 'skillName' })
  async set(
    @Param('skillName') skillName: string,
    @Body() dto: SetProficiencyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DataResponse<{ skillName: string; proficiency: string }>> {
    const result = await this.service.setForUser(
      req.user.userId,
      skillName,
      dto.proficiency,
      dto.yearsOfExperience ?? null,
    );
    return { success: true, data: result };
  }

  @Delete(':skillName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear proficiency for a skill.' })
  @ApiParam({ name: 'skillName' })
  async clear(
    @Param('skillName') skillName: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.service.clearForUser(req.user.userId, skillName);
  }
}
