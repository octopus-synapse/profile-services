import { Body, Controller, Delete, HttpCode, HttpStatus, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { DEACTIVATE_ACCOUNT_PORT, DeactivateAccountPort } from '../../ports/inbound';
import { DeactivateAccountDto, DeactivateAccountResponseDto } from './deactivate-account.dto';

interface AuthenticatedUser {
  id: string;
}

@ApiTags('Account Lifecycle')
@Controller('accounts')
export class DeactivateAccountController {
  constructor(
    @Inject(DEACTIVATE_ACCOUNT_PORT)
    private readonly deactivateAccount: DeactivateAccountPort,
  ) {}

  @Delete('deactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate account',
    description: 'Deactivates the authenticated user account (soft delete).',
  })
  @ApiDataResponse(DeactivateAccountResponseDto, {
    description: 'Account deactivated',
  })
  @ApiConflictResponse({
    description: 'Account already deactivated',
  })
  async handle(
    @Body() dto: DeactivateAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataResponse<DeactivateAccountResponseDto>> {
    await this.deactivateAccount.execute({
      userId: user.id,
      reason: dto.reason,
    });

    return {
      success: true,
      data: {
        message: 'Account has been deactivated.',
      },
    };
  }
}
