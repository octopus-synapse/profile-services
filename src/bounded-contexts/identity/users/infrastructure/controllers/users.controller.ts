import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type {
  UpdateFullPreferences,
  UpdatePreferences,
  UpdateProfile,
  UpdateUsername,
  ValidateUsernameRequest,
} from '@/shared-kernel';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { UsersService } from '../../application/services/users.service';
import { ValidateUsernameResponseDto } from '../../dto/username-response.dto';
import {
  PublicProfileResponseDto,
  UpdateUsernameResponseDto,
  UserFullPreferencesResponseDto,
  UsernameAvailabilityResponseDto,
  UserPreferencesResponseDto,
  UserProfileResponseDto,
} from '../../dto/users.dto';

@SdkExport({ tag: 'users', description: 'User profile and preferences' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get(':username/profile')
  @ApiOperation({ summary: 'Get public profile by username' })
  @ApiParam({ name: 'username', type: 'string' })
  @ApiDataResponse(PublicProfileResponseDto, {
    description: 'Public profile retrieved',
  })
  async getPublicProfileByUsername(
    @Param('username') username: string,
  ): Promise<DataResponse<PublicProfileResponseDto>> {
    const result = await this.usersService.getPublicProfileByUsername(username);
    return {
      success: true,
      data: this.toPublicProfileResponseDto(result, username),
    };
  }

  @RequirePermission(Permission.USER_PROFILE_READ)
  @Get('profile')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiDataResponse(UserProfileResponseDto, {
    description: 'User profile retrieved successfully',
  })
  async getProfile(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<UserProfileResponseDto>> {
    const result = await this.usersService.getProfile(user.userId);
    return { success: true, data: this.toUserProfileResponseDto(result) };
  }

  @RequirePermission(Permission.USER_PROFILE_UPDATE)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update authenticated user profile' })
  @ApiDataResponse(UserProfileResponseDto, {
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateProfile: UpdateProfile,
  ): Promise<DataResponse<UserProfileResponseDto>> {
    const result = await this.usersService.updateProfile(user.userId, updateProfile);
    return { success: true, data: this.toUserProfileResponseDto(result) };
  }

  @RequirePermission(Permission.USER_PROFILE_READ)
  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiDataResponse(UserPreferencesResponseDto, {
    description: 'Preferences retrieved successfully',
  })
  async getPreferences(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<UserPreferencesResponseDto>> {
    const result = await this.usersService.getPreferences(user.userId);
    return {
      success: true,
      data: this.toUserPreferencesResponseDto(result),
    };
  }

  @RequirePermission(Permission.USER_PROFILE_UPDATE)
  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiDataResponse(UserPreferencesResponseDto, {
    description: 'Preferences updated successfully',
  })
  async updatePreferences(
    @CurrentUser() user: UserPayload,
    @Body() updatePreferences: UpdatePreferences,
  ): Promise<DataResponse<UserPreferencesResponseDto>> {
    await this.usersService.updatePreferences(user.userId, updatePreferences);
    const result = await this.usersService.getPreferences(user.userId);
    return {
      success: true,
      data: this.toUserPreferencesResponseDto(result),
    };
  }

  @RequirePermission(Permission.USER_PROFILE_READ)
  @Get('preferences/full')
  @ApiOperation({ summary: 'Get full user preferences' })
  @ApiDataResponse(UserFullPreferencesResponseDto, {
    description: 'Full preferences retrieved successfully',
  })
  async getFullPreferences(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<UserFullPreferencesResponseDto>> {
    const result = await this.usersService.getFullPreferences(user.userId);
    return {
      success: true,
      data: this.toUserFullPreferencesResponseDto(result),
    };
  }

  @RequirePermission(Permission.USER_PROFILE_UPDATE)
  @Patch('preferences/full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update full user preferences' })
  @ApiDataResponse(UserFullPreferencesResponseDto, {
    description: 'Full preferences updated successfully',
  })
  async updateFullPreferences(
    @CurrentUser() user: UserPayload,
    @Body() updateFullPreferences: UpdateFullPreferences,
  ): Promise<DataResponse<UserFullPreferencesResponseDto>> {
    const result = await this.usersService.updateFullPreferences(
      user.userId,
      updateFullPreferences,
    );
    return {
      success: true,
      data: this.toUserFullPreferencesResponseDto(result),
    };
  }

  @RequirePermission(Permission.USER_PROFILE_UPDATE)
  @Patch('username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update username' })
  @ApiDataResponse(UpdateUsernameResponseDto, {
    description: 'Username updated successfully',
  })
  async updateUsername(
    @CurrentUser() user: UserPayload,
    @Body() updateUsername: UpdateUsername,
  ): Promise<DataResponse<UpdateUsernameResponseDto>> {
    const result = await this.usersService.updateUsername(user.userId, updateUsername);
    return {
      success: true,
      data: {
        success: true,
        message: 'Username updated successfully',
        username: result.username,
      },
    };
  }

  @RequirePermission(Permission.USER_PROFILE_READ)
  @Get('username/check')
  @ApiOperation({ summary: 'Check username availability' })
  @ApiQuery({
    name: 'username',
    required: true,
    description: 'Username to check',
    example: 'john_doe',
  })
  @ApiDataResponse(UsernameAvailabilityResponseDto, {
    description: 'Username availability status',
  })
  async checkUsernameAvailability(
    @CurrentUser() user: UserPayload,
    @Query('username') username: string,
  ): Promise<DataResponse<UsernameAvailabilityResponseDto>> {
    const result = await this.usersService.checkUsernameAvailability(username, user.userId);
    return { success: true, data: result };
  }

  @Public()
  @Post('username/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate username format and availability',
    description:
      'Validates username against all business rules (format, length, reserved words) and checks availability. Returns structured validation result with all errors.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to validate',
          example: 'john_doe',
        },
      },
      required: ['username'],
    },
  })
  @ApiDataResponse(ValidateUsernameResponseDto, {
    description: 'Validation result',
  })
  async validateUsername(
    @Body() body: ValidateUsernameRequest,
  ): Promise<DataResponse<ValidateUsernameResponseDto>> {
    const result = await this.usersService.validateUsername(body.username);
    return {
      success: true,
      data: {
        username: result.username,
        valid: result.valid,
        available: result.available,
        errors: result.errors,
      },
    };
  }

  private toPublicProfileResponseDto(
    result: {
      user?: {
        displayName?: string | null;
        photoURL?: string | null;
        bio?: string | null;
        location?: string | null;
      };
    },
    username: string,
  ): PublicProfileResponseDto {
    return {
      username,
      displayName: result.user?.displayName ?? undefined,
      photoURL: result.user?.photoURL ?? undefined,
      bio: result.user?.bio ?? undefined,
      location: result.user?.location ?? undefined,
    };
  }

  private toUserProfileResponseDto(result: {
    id: string;
    email: string | null;
    username?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    bio?: string | null;
    location?: string | null;
    phone?: string | null;
    website?: string | null;
    linkedin?: string | null;
    github?: string | null;
    twitter?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): UserProfileResponseDto {
    return {
      id: result.id,
      email: result.email ?? '',
      username: result.username ?? undefined,
      displayName: result.displayName ?? undefined,
      photoURL: result.photoURL ?? undefined,
      bio: result.bio ?? undefined,
      location: result.location ?? undefined,
      phone: result.phone ?? undefined,
      website: result.website ?? undefined,
      linkedin: result.linkedin ?? undefined,
      github: result.github ?? undefined,
      twitter: result.twitter ?? undefined,
      createdAt: this.toIsoString(result.createdAt),
      updatedAt: this.toIsoString(result.updatedAt),
    };
  }

  private toUserPreferencesResponseDto(result: {
    palette?: string | null;
    bannerColor?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    theme?: string | null;
    language?: string | null;
    emailNotifications?: boolean | null;
  }): UserPreferencesResponseDto {
    return {
      palette: result.palette ?? undefined,
      bannerColor: result.bannerColor ?? undefined,
      displayName: result.displayName ?? undefined,
      photoURL: result.photoURL ?? undefined,
    };
  }

  private toUserFullPreferencesResponseDto(result: {
    palette?: string | null;
    bannerColor?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    language?: string | null;
    timezone?: string | null;
    emailNotifications?: boolean | null;
    marketingEmails?: boolean | null;
  }): UserFullPreferencesResponseDto {
    return {
      ...this.toUserPreferencesResponseDto(result),
      language: result.language ?? undefined,
      timezone: result.timezone ?? undefined,
      emailNotifications: result.emailNotifications ?? undefined,
      marketingEmails: result.marketingEmails ?? undefined,
    };
  }

  private toIsoString(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
