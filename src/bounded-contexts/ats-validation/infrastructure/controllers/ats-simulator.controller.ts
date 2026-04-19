import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  type AtsSimulationInput,
  simulateAtsParsing,
} from '../../ats/simulation/ats-parser-simulator';

@SdkExport({ tag: 'ats', description: 'ATS Simulator API' })
@ApiTags('ats')
@ApiBearerAuth('JWT-auth')
@Controller('v1/ats/simulate')
export class AtsSimulatorController {
  @Post()
  @RequirePermission(Permission.RESUME_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Run a resume AST through the ATS parser simulator and return the extracted text + warnings.',
  })
  async simulate(
    @CurrentUser() _user: UserPayload,
    @Body() body: AtsSimulationInput,
  ): Promise<{ success: true; data: ReturnType<typeof simulateAtsParsing> }> {
    const result = simulateAtsParsing(body);
    return { success: true, data: result };
  }
}
