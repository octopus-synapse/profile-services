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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import type {
  UpdateProfile,
  UpdatePreferences,
  UpdateFullPreferences,
  UpdateUsername,
  ValidateUsernameRequest,
} from '@/shared-kernel';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import {
  PublicProfileResponseDto,
  UserFullPreferencesResponseDto,
  UserPreferencesResponseDto,
  UserProfileResponseDto,
} from '@/shared-kernel/dtos/sdk-response.dto';
import { ValidateUsernameResponseDto } from './dto/username-response.dto';

@SdkExport({ tag: 'users', description: 'User profile and preferences' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get(':username/profile')
  @ApiOperation({ summary: "Get a user's public profile by username" })
  @ApiResponse({ status: 200, type: PublicProfileResponseDto })
  @ApiResponse({ status: 200, description: 'Public profile retrieved' })
  @ApiResponse({ status: 404, description: 'Public profile not found' })
  async getPublicProfileByUsername(@Param('username') username: string) {
    return this.usersService.getPublicProfileByUsername(username);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUser() user: UserPayload) {
    return this.usersService.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateProfile: UpdateProfile,
  ) {
    return this.usersService.updateProfile(user.userId, updateProfile);
  }

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

  @UseGuards(JwtAuthGuard)
  @Patch('username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update username (once every 30 days)' })
  @ApiResponse({
    status: 200,
    description: 'Username updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Username updated successfully',
        username: 'new_username',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid username or cooldown period active',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  async updateUsername(
    @CurrentUser() user: UserPayload,
    @Body() updateUsername: UpdateUsername,
  ) {
    return this.usersService.updateUsername(user.userId, updateUsername);
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
  @ApiResponse({
    status: 200,
    description: 'Username availability status',
    schema: {
      example: {
        username: 'john_doe',
        available: true,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkUsernameAvailability(
    @CurrentUser() user: UserPayload,
    @Query('username') username: string,
  ) {
    return this.usersService.checkUsernameAvailability(username, user.userId);
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
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: ValidateUsernameResponseDto,
  })
  async validateUsername(@Body() body: ValidateUsernameRequest) {
    return this.usersService.validateUsername(body.username);
  }
}
