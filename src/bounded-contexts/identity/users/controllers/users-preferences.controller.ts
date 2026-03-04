/**
 * Users Preferences Controller
 * Handles user preferences operations
 */

import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { UsersService } from '@/bounded-contexts/identity/users/users.service';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { UpdateFullPreferences, UpdatePreferences } from '@/shared-kernel';
import {
  UserFullPreferencesDataDto,
  UserOperationMessageDataDto,
  UserPreferencesDataDto,
} from '../dto/controller-response.dto';

@SdkExport({ tag: 'users', description: 'Users API' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users')
export class UsersPreferencesController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences (basic)' })
  @ApiDataResponse(UserPreferencesDataDto, {
    description: 'Preferences retrieved successfully',
  })
  async getPreferences(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<UserPreferencesDataDto>> {
    const preferences = await this.usersService.getPreferences(user.userId);
    return { success: true, data: { preferences } };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user preferences (basic)' })
  @ApiDataResponse(UserOperationMessageDataDto, {
    description: 'Preferences updated successfully',
  })
  async updatePreferences(
    @CurrentUser() user: UserPayload,
    @Body() updatePreferences: UpdatePreferences,
  ): Promise<DataResponse<UserOperationMessageDataDto>> {
    await this.usersService.updatePreferences(user.userId, updatePreferences);

    return {
      success: true,
      data: {
        message: 'Preferences updated successfully',
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences/full')
  @ApiOperation({ summary: 'Get all user preferences' })
  @ApiDataResponse(UserFullPreferencesDataDto, {
    description: 'Full preferences retrieved successfully',
  })
  async getFullPreferences(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<UserFullPreferencesDataDto>> {
    const preferences = await this.usersService.getFullPreferences(user.userId);
    return { success: true, data: { preferences } };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences/full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update all user preferences' })
  @ApiDataResponse(UserFullPreferencesDataDto, {
    description: 'Full preferences updated successfully',
  })
  async updateFullPreferences(
    @CurrentUser() user: UserPayload,
    @Body() updateFullPreferences: UpdateFullPreferences,
  ): Promise<DataResponse<UserFullPreferencesDataDto>> {
    const preferences = await this.usersService.updateFullPreferences(
      user.userId,
      updateFullPreferences,
    );

    return {
      success: true,
      data: {
        preferences,
      },
    };
  }
}
