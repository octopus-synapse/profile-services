import { Body, Controller, Delete, HttpCode, HttpStatus, Inject, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { DeleteAccountPort } from '../../ports/inbound';
import { DELETE_ACCOUNT_PORT } from '../../ports/inbound';
import { DeleteAccountDto, DeleteAccountResponseDto } from './delete-account.dto';

interface AuthenticatedUser {
  id: string;
}

@ApiTags('Account Lifecycle')
@Controller('accounts')
export class DeleteAccountController {
  constructor(
    @Inject(DELETE_ACCOUNT_PORT)
    private readonly deleteAccount: DeleteAccountPort,
  ) {}

  @Delete()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete account permanently',
    description:
      'Permanently deletes the user account. Requires confirmation phrase: "DELETE MY ACCOUNT".',
  })
  @ApiDataResponse(DeleteAccountResponseDto, {
    description: 'Account deleted permanently',
  })
  @ApiBadRequestResponse({
    description: 'Invalid confirmation phrase',
  })
  async handle(
    @Body() dto: DeleteAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DataResponse<DeleteAccountResponseDto>> {
    await this.deleteAccount.execute({
      userId: user.id,
      confirmationPhrase: dto.confirmationPhrase,
    });

    return {
      success: true,
      data: {
        message: 'Account has been permanently deleted.',
      },
    };
  }
}
