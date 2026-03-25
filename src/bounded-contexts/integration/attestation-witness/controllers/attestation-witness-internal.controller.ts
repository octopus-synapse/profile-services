import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { InternalAuthGuard } from '@/bounded-contexts/integration/mec-sync/guards/internal-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  AttestationWitnessEnvelopeDto,
  AttestationWitnessRunDataDto,
  AttestationWitnessStatusDataDto,
  CreateAttestationWitnessRunRequestDto,
} from '../dto/attestation-witness.dto';
import { AttestationWitnessRunService } from '../services/attestation-witness-run.service';

@SdkExport({
  tag: 'attestation-witness-internal',
  description: 'Attestation Witness Internal API',
  requiresAuth: false,
})
@ApiTags('attestation-witness-internal')
@Controller('v1/attestation-witness/internal')
export class AttestationWitnessInternalController {
  constructor(private readonly runService: AttestationWitnessRunService) {}

  @Post('runs')
  @Public()
  @UseGuards(InternalAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('snapshot'))
  @ApiOperation({ summary: 'Create or reuse a witness attestation run' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateAttestationWitnessRunRequestDto })
  @ApiDataResponse(AttestationWitnessRunDataDto, {
    description: 'Witness run accepted',
    status: 202,
  })
  @ApiHeader({ name: 'x-internal-token', required: true })
  async createRun(
    @Body() body: CreateAttestationWitnessRunRequestDto,
    @UploadedFile() snapshot: Express.Multer.File,
  ): Promise<DataResponse<AttestationWitnessRunDataDto>> {
    const run = await this.runService.createRun({
      sourceTreeHash: body.sourceTreeHash,
      gitTreeObjectId: body.gitTreeObjectId,
      snapshot,
    });

    return {
      success: true,
      data: {
        runId: run.id,
        status: run.status,
        sourceTreeHash: run.sourceTreeHash,
      },
    };
  }

  @Get('runs/:runId')
  @Public()
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: 'Get witness run status' })
  @ApiDataResponse(AttestationWitnessStatusDataDto, {
    description: 'Witness run status returned',
  })
  @ApiHeader({ name: 'x-internal-token', required: true })
  async getRunStatus(
    @Param('runId') runId: string,
  ): Promise<DataResponse<AttestationWitnessStatusDataDto>> {
    const run = await this.runService.getRunStatus(runId);

    return {
      success: true,
      data: {
        runId: run.id,
        status: run.status,
        sourceTreeHash: run.sourceTreeHash,
        attestationReady: Boolean(run.attestationPath),
        errorMessage: run.errorMessage ?? undefined,
      },
    };
  }

  @Get('attestations/:sourceTreeHash')
  @Public()
  @UseGuards(InternalAuthGuard)
  @ApiOperation({ summary: 'Get the signed attestation for a completed run' })
  @ApiDataResponse(AttestationWitnessEnvelopeDto, {
    description: 'Signed attestation returned',
  })
  @ApiHeader({ name: 'x-internal-token', required: true })
  async getAttestation(
    @Param('sourceTreeHash') sourceTreeHash: string,
  ): Promise<DataResponse<AttestationWitnessEnvelopeDto>> {
    const envelope = await this.runService.getAttestationBySourceTreeHash(sourceTreeHash);

    return {
      success: true,
      data: envelope,
    };
  }
}
