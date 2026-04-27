/**
 * MEC Metadata Controller — public endpoints for UFs, knowledge areas
 * and aggregate stats.
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { MecSyncUseCases } from '../../application/ports/mec-sync.port';
import {
  MecKnowledgeAreasDataDto,
  MecStateCodesDataDto,
  MecStatisticsDataDto,
} from '../../dto/controller-response.dto';

@SdkExport({ tag: 'mec-metadata', description: 'Mec Metadata API', requiresAuth: false })
@ApiTags('mec-metadata')
@Controller('v1/mec')
export class MecMetadataController {
  constructor(private readonly bc: MecSyncUseCases) {}

  @Get('ufs')
  @Public()
  @ApiOperation({ summary: 'List all states (UFs)' })
  @ApiDataResponse(MecStateCodesDataDto, { description: 'State codes returned' })
  async listAllStateCodes(): Promise<DataResponse<MecStateCodesDataDto>> {
    const states = await this.bc.listStateCodes.execute();

    return { success: true, data: { states } };
  }

  @Get('areas')
  @Public()
  @ApiOperation({ summary: 'List knowledge areas' })
  @ApiDataResponse(MecKnowledgeAreasDataDto, { description: 'Knowledge areas returned' })
  async listAllKnowledgeAreas(): Promise<DataResponse<MecKnowledgeAreasDataDto>> {
    const areas = await this.bc.listKnowledgeAreas.execute();

    return { success: true, data: { areas } };
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get MEC statistics' })
  @ApiDataResponse(MecStatisticsDataDto, { description: 'MEC statistics returned' })
  async getMecStatistics(): Promise<DataResponse<MecStatisticsDataDto>> {
    const stats = await this.bc.getMecStatistics.execute();

    return { success: true, data: { stats } };
  }
}
