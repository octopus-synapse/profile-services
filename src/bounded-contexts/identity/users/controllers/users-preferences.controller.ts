/**
 * Users Preferences Controller
 * Handles user preferences operations
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  UserFullPreferencesResponseDto,
  UserPreferencesResponseDto,
} from '@/shared-kernel/dtos/sdk-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { UsersService } from '@/bounded-contexts/identity/users/users.service';
import type { UpdatePreferences, UpdateFullPreferences } from '@/shared-kernel';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';

@SdkExport({ tag: 'users', description: 'Users API' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users')
export class UsersPreferencesController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences (basic)' })
  @ApiResponse({ status: 200, type: UserPreferencesResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPreferences(@CurrentUser() user: UserPayload) {
    return this.usersService.getPreferences(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user preferences (basic)' })
  @ApiResponse({ status: 200, type: UserPreferencesResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updatePreferences(
    @CurrentUser() user: UserPayload,
    @Body() updatePreferences: UpdatePreferences,
  ) {
    return this.usersService.updatePreferences(user.userId, updatePreferences);
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences/full')
  @ApiOperation({ summary: 'Get all user preferences' })
  @ApiResponse({ status: 200, type: UserFullPreferencesResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Full preferences retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFullPreferences(@CurrentUser() user: UserPayload) {
    return this.usersService.getFullPreferences(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences/full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update all user preferences' })
  @ApiResponse({ status: 200, type: UserFullPreferencesResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Full preferences updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateFullPreferences(
    @CurrentUser() user: UserPayload,
    @Body() updateFullPreferences: UpdateFullPreferences,
  ) {
    return this.usersService.updateFullPreferences(
      user.userId,
      updateFullPreferences,
    );
  }
}
