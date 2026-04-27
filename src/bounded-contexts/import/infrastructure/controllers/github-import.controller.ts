import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ImportUseCases } from '../../application/ports/import.port';

interface GithubImportBody {
  token: string;
  username?: string;
  repoLimit?: number;
}

@SdkExport({ tag: 'import', description: 'GitHub import API' })
@ApiTags('import')
@ApiBearerAuth('JWT-auth')
@Controller('v1/import/github')
export class GithubImportController {
  constructor(private readonly bc: ImportUseCases) {}

  @Post('parse')
  @RequirePermission(Permission.RESUME_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Parse a GitHub profile (repos + languages) into suggested resume content. Does not write to the resume — the client previews, the user accepts.',
  })
  async parse(
    @CurrentUser() _user: UserPayload,
    @Body() body: GithubImportBody,
  ): Promise<{ success: true; data: unknown }> {
    const parsed = await this.bc.importGithub.execute({
      token: body.token,
      username: body.username,
      repoLimit: body.repoLimit,
    });
    return { success: true, data: parsed };
  }
}
