/**
 * Auth Account Controller
 * Handles account management endpoints
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '@/bounded-contexts/identity/auth/auth.service';
import type {
  ChangeEmail,
  DeleteAccount,
} from '@octopus-synapse/profile-contracts';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '../interfaces/auth-request.interface';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthAccountController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change email address (authenticated)' })
  @ApiResponse({ status: 200, description: 'Email changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or password' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async changeEmail(
    @CurrentUser() user: UserPayload,
    @Body() dto: ChangeEmail,
  ) {
    return this.authService.changeEmail(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete own account (authenticated)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Password is incorrect' })
  async deleteAccount(
    @CurrentUser() user: UserPayload,
    @Body() dto: DeleteAccount,
  ) {
    return this.authService.deleteAccount(user.userId, dto);
  }
}
