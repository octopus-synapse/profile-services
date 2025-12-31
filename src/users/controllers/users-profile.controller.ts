/**
 * Users Profile Controller
 * Handles user profile operations
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from '../users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateUsernameDto } from '../dto/update-username.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../auth/interfaces/auth-request.interface';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get(':username/profile')
  @ApiOperation({ summary: "Get a user's public profile by username" })
  @ApiResponse({ status: 200, description: 'Public profile retrieved' })
  @ApiResponse({ status: 404, description: 'Public profile not found' })
  async getPublicProfileByUsername(@Param('username') username: string) {
    return this.usersService.getPublicProfileByUsername(username);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
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
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, updateProfileDto);
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
    @Body() updateUsernameDto: UpdateUsernameDto,
  ) {
    return this.usersService.updateUsername(user.userId, updateUsernameDto);
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
}
