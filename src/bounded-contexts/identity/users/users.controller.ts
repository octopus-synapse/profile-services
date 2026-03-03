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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard, Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
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
import {
  PublicProfileResponseDto,
  UserFullPreferencesResponseDto,
  UserPreferencesResponseDto,
  UserProfileResponseDto,
} from '@/shared-kernel/dtos/sdk-response.dto';
import { ValidateUsernameResponseDto } from './dto/username-response.dto';
import { UsersService } from './users.service';

class UpdateUsernameResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Username updated successfully' })
  message!: string;

  @ApiProperty({ example: 'new_username' })
  username!: string;
}

class UsernameAvailabilityResponseDto {
  @ApiProperty({ example: 'john_doe' })
  username!: string;

  @ApiProperty({ example: true })
  available!: boolean;
}

@SdkExport({ tag: 'users', description: 'User profile and preferences' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get(':username/profile')
  @ApiOperation({ summary: "Get a user's public profile by username" })
  @ApiDataResponse(PublicProfileResponseDto, {
    description: 'Public profile retrieved',
  })
  async getPublicProfileByUsername(
    @Param('username') username: string,
  ): Promise<DataResponse<PublicProfileResponseDto>> {
    const result = await this.usersService.getPublicProfileByUsername(username);
    return {
      success: true,
      data: result as unknown as PublicProfileResponseDto,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiDataResponse(UserProfileResponseDto, {
    description: 'User profile retrieved successfully',
  })
  async getProfile(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<UserProfileResponseDto>> {
    const result = await this.usersService.getProfile(user.userId);
    return { success: true, data: result as unknown as UserProfileResponseDto };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiDataResponse(UserProfileResponseDto, {
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateProfile: UpdateProfile,
  ): Promise<DataResponse<UserProfileResponseDto>> {
    const result = await this.usersService.updateProfile(user.userId, updateProfile);
    return { success: true, data: result as unknown as UserProfileResponseDto };
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences (basic)' })
  @ApiDataResponse(UserPreferencesResponseDto, {
    description: 'Preferences retrieved successfully',
  })
  async getPreferences(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<UserPreferencesResponseDto>> {
    const result = await this.usersService.getPreferences(user.userId);
    return {
      success: true,
      data: result as unknown as UserPreferencesResponseDto,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user preferences (basic)' })
  @ApiDataResponse(UserPreferencesResponseDto, {
    description: 'Preferences updated successfully',
  })
  async updatePreferences(
    @CurrentUser() user: UserPayload,
    @Body() updatePreferences: UpdatePreferences,
  ): Promise<DataResponse<UserPreferencesResponseDto>> {
    const result = await this.usersService.updatePreferences(user.userId, updatePreferences);
    return {
      success: true,
      data: result as unknown as UserPreferencesResponseDto,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences/full')
  @ApiOperation({ summary: 'Get all user preferences' })
  @ApiDataResponse(UserFullPreferencesResponseDto, {
    description: 'Full preferences retrieved successfully',
  })
  async getFullPreferences(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<UserFullPreferencesResponseDto>> {
    const result = await this.usersService.getFullPreferences(user.userId);
    return {
      success: true,
      data: result as unknown as UserFullPreferencesResponseDto,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences/full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update all user preferences' })
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
      data: result as unknown as UserFullPreferencesResponseDto,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update username (once every 30 days)' })
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
      data: result as unknown as UpdateUsernameResponseDto,
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
      data: result as unknown as ValidateUsernameResponseDto,
    };
  }
}
