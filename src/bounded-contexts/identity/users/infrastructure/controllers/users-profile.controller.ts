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
  Inject,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { UpdateUser, UpdateUsername } from '@/shared-kernel';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  USER_PROFILE_USE_CASES,
  type UserProfile,
  type UserProfileUseCases,
} from '../../application/ports/user-profile.port';
import { UsernameService } from '../../application/services/username.service';
import {
  PublicProfileDataDto,
  PublicProfileDataSchema,
  UsernameAvailabilityDataDto,
  UsernameUpdateDataDto,
  UserProfileDataDto,
} from '../../dto/controller-response.dto';

class UpdateUserProfileRequestDto {
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() username?: string;
  @ApiPropertyOptional({ maxLength: 500 }) bio?: string;
  @ApiPropertyOptional({ maxLength: 100 }) location?: string;
  @ApiPropertyOptional({ format: 'uri' }) website?: string;
  @ApiPropertyOptional({ maxLength: 100 }) company?: string;
  @ApiPropertyOptional({ maxLength: 100 }) title?: string;
  @ApiPropertyOptional({ maxLength: 20 }) phone?: string;
  @ApiPropertyOptional({ format: 'uri' }) linkedin?: string;
  @ApiPropertyOptional({ format: 'uri' }) github?: string;
  @ApiPropertyOptional({ format: 'uri' }) twitter?: string;
  @ApiPropertyOptional({ format: 'uri' }) image?: string;
}

class UpdateUsernameRequestDto {
  @ApiPropertyOptional() username?: string;
}

@SdkExport({ tag: 'users', description: 'Users API' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users')
export class UsersProfileController {
  constructor(
    @Inject(USER_PROFILE_USE_CASES)
    private readonly profile: UserProfileUseCases,
    private readonly usernameService: UsernameService,
  ) {}

  private buildProfileData(profile: UserProfile): UserProfileDataDto & Record<string, unknown> {
    return { ...profile, profile };
  }

  @Public()
  @Get(':username/profile')
  @ApiOperation({ summary: "Get a user's public profile by username" })
  @ApiDataResponse(PublicProfileDataDto, { description: 'Public profile retrieved' })
  async getPublicProfileByUsername(
    @Param('username') username: string,
  ): Promise<DataResponse<PublicProfileDataDto>> {
    const data = await this.profile.getPublicProfileUseCase.execute(username);
    return {
      success: true,
      data: PublicProfileDataSchema.parse({ user: data.user, resume: data.resume }),
    };
  }

  @RequirePermission(Permission.USER_PROFILE_READ)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiDataResponse(UserProfileDataDto, { description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser() user: UserPayload): Promise<DataResponse<UserProfileDataDto>> {
    const result = await this.profile.getProfileUseCase.execute(user.userId);
    return {
      success: true,
      data: this.buildProfileData(result),
    };
  }

  @RequirePermission(Permission.USER_PROFILE_UPDATE)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserProfileRequestDto })
  @ApiDataResponse(UserProfileDataDto, { description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateUserData: UpdateUser,
  ): Promise<DataResponse<UserProfileDataDto>> {
    const result = await this.profile.updateProfileUseCase.execute(user.userId, updateUserData);
    return {
      success: true,
      data: this.buildProfileData(result),
    };
  }

  @RequirePermission(Permission.USER_PROFILE_UPDATE)
  @Patch('username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update username (once every 30 days)' })
  @ApiBody({ type: UpdateUsernameRequestDto })
  @ApiDataResponse(UsernameUpdateDataDto, { description: 'Username updated successfully' })
  async updateUsername(
    @CurrentUser() user: UserPayload,
    @Body() updateUsername: UpdateUsername,
  ): Promise<DataResponse<UsernameUpdateDataDto>> {
    const result = await this.usernameService.updateUsername(user.userId, updateUsername);
    return {
      success: true,
      data: { username: result.username, message: 'Username updated successfully' },
    };
  }

  @RequirePermission(Permission.USER_PROFILE_READ)
  @Get('username/check')
  @ApiOperation({ summary: 'Check if a username is available' })
  @ApiQuery({
    name: 'username',
    required: true,
    description: 'Username to check',
    example: 'john_doe',
  })
  @ApiDataResponse(UsernameAvailabilityDataDto, { description: 'Username availability status' })
  async checkUsernameAvailability(
    @CurrentUser() user: UserPayload,
    @Query('username') username: string,
  ): Promise<DataResponse<UsernameAvailabilityDataDto>> {
    const availability = await this.usernameService.checkUsernameAvailability(
      username,
      user.userId,
    );
    return {
      success: true,
      data: {
        username: availability.username,
        available: availability.available,
        ...(availability.reason ? { reason: availability.reason } : {}),
      },
    };
  }
}
