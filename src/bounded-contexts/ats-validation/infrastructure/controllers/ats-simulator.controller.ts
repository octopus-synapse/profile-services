import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AtsSimulatorService } from '../../ats/services/ats-simulator.service';
import {
  type AtsSimulationInput,
  type AtsSimulationResult,
  simulateAtsParsing,
} from '../../ats/simulation/ats-parser-simulator';

@SdkExport({ tag: 'ats', description: 'ATS Simulator API' })
@ApiTags('ats')
@ApiBearerAuth('JWT-auth')
@Controller('v1/ats/simulate')
export class AtsSimulatorController {
  constructor(private readonly service: AtsSimulatorService) {}

  @Post()
  @RequirePermission(Permission.RESUME_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Run an explicit AtsSimulationInput payload through the simulator. Use this when the caller has already shaped the AST.',
  })
  async simulate(
    @CurrentUser() _user: UserPayload,
    @Body() body: AtsSimulationInput,
  ): Promise<{ success: true; data: AtsSimulationResult }> {
    return { success: true, data: simulateAtsParsing(body) };
  }

  @Get(':resumeId')
  @RequirePermission(Permission.RESUME_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Convenience endpoint: load a resume by id, map it to AtsSimulationInput, and run the simulator in one call.',
  })
  async simulateForResume(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
  ): Promise<{ success: true; data: AtsSimulationResult }> {
    const data = await this.service.simulateForResume(resumeId, user.userId);
    return { success: true, data };
  }
}
