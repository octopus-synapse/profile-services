/**
 * Auth Account Controller
 * Handles account management endpoints
 */

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/bounded-contexts/identity/auth/auth.service';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { ChangeEmail, DeleteAccount } from '@/shared-kernel';
import { DeleteResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { UserPayload } from '../interfaces/auth-request.interface';

class ChangeEmailResponseDto {
  @ApiProperty({ example: 'Email changed successfully' })
  message!: string;
}

@SdkExport({ tag: 'auth', description: 'Auth API' })
@ApiTags('auth')
@Controller('v1/auth')
export class AuthAccountController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change email address (authenticated)' })
  @ApiDataResponse(ChangeEmailResponseDto, {
    description: 'Email changed successfully',
  })
  async changeEmail(
    @CurrentUser() user: UserPayload,
    @Body() dto: ChangeEmail,
  ): Promise<DataResponse<ChangeEmailResponseDto>> {
    const result = await this.authService.changeEmail(user.userId, dto);
    return { success: true, data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete own account (authenticated)' })
  @ApiDataResponse(DeleteResponseDto, {
    description: 'Account deleted successfully',
  })
  async deleteAccount(
    @CurrentUser() user: UserPayload,
    @Body() dto: DeleteAccount,
  ): Promise<DataResponse<DeleteResponseDto>> {
    const result = await this.authService.deleteAccount(user.userId, dto);
    return { success: true, data: result };
  }
}
