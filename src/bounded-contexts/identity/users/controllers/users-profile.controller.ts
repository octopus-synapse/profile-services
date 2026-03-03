/**
 * Users Profile Controller
 * Handles user profile operations
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard, Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { UsersService } from '@/bounded-contexts/identity/users/users.service';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { UpdateUser as UpdateProfile, UpdateUsername } from '@/shared-kernel';
import {
  PublicProfileDataDto,
  UsernameAvailabilityDataDto,
  UsernameUpdateDataDto,
  UserProfileDataDto,
} from '../dto/controller-response.dto';

@SdkExport({ tag: 'users', description: 'Users API' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users')
export class UsersProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get(':username/profile')
  @ApiOperation({ summary: "Get a user's public profile by username" })
  @ApiDataResponse(PublicProfileDataDto, {
    description: 'Public profile retrieved',
  })
  async getPublicProfileByUsername(
    @Param('username') username: string,
  ): Promise<DataResponse<PublicProfileDataDto>> {
    const profile = await this.usersService.getPublicProfileByUsername(username);
    return {
      success: true,
      data: {
        user: profile.user,
        resume: profile.resume,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiDataResponse(UserProfileDataDto, {
    description: 'User profile retrieved successfully',
  })
  async getProfile(@CurrentUser() user: UserPayload): Promise<DataResponse<UserProfileDataDto>> {
    const profile = await this.usersService.getProfile(user.userId);
    return { success: true, data: { profile } };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiDataResponse(UserProfileDataDto, {
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateProfile: UpdateProfile,
  ): Promise<DataResponse<UserProfileDataDto>> {
    const result = await this.usersService.updateProfile(user.userId, updateProfile);

    return {
      success: true,
      data: {
        profile: result,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update username (once every 30 days)' })
  @ApiDataResponse(UsernameUpdateDataDto, {
    description: 'Username updated successfully',
  })
  async updateUsername(
    @CurrentUser() user: UserPayload,
    @Body() updateUsername: UpdateUsername,
  ): Promise<DataResponse<UsernameUpdateDataDto>> {
    const result = await this.usersService.updateUsername(user.userId, updateUsername);

    return {
      success: true,
      data: {
        username: result.username,
        message: 'Username updated successfully',
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('username/check')
  @ApiOperation({ summary: 'Check if a username is available' })
  @ApiQuery({
    name: 'username',
    required: true,
    description: 'Username to check',
    example: 'john_doe',
  })
  @ApiDataResponse(UsernameAvailabilityDataDto, {
    description: 'Username availability status',
  })
  async checkUsernameAvailability(
    @CurrentUser() user: UserPayload,
    @Query('username') username: string,
  ): Promise<DataResponse<UsernameAvailabilityDataDto>> {
    const availability = await this.usersService.checkUsernameAvailability(username, user.userId);

    return {
      success: true,
      data: {
        username: availability.username,
        available: availability.available,
      },
    };
  }
}
