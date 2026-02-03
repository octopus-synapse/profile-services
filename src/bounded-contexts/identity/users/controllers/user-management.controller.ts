/**
 * User Management Controller
 *
 * Endpoints for managing users (CRUD operations).
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for user management operations.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import {
  PermissionGuard,
  RequirePermission,
} from '@/bounded-contexts/identity/authorization';
import { UserManagementService } from '../services/user-management.service';
import type {
  AdminCreateUser,
  AdminUpdateUser,
  AdminResetPassword,
} from '@octopus-synapse/profile-contracts';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users/manage')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserManagementController {
  constructor(private readonly userManagement: UserManagementService) {}

  @Get()
  @RequirePermission('user', 'read')
  @ApiOperation({ summary: 'List all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.userManagement.listUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
    });
  }

  @Get(':id')
  @RequirePermission('user', 'read')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('id') userId: string) {
    return this.userManagement.getUserDetails(userId);
  }

  @Post()
  @RequirePermission('user', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(@Body() data: AdminCreateUser) {
    return this.userManagement.createUser(data);
  }

  @Patch(':id')
  @RequirePermission('user', 'update')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(@Param('id') userId: string, @Body() data: AdminUpdateUser) {
    return this.userManagement.updateUser(userId, data);
  }

  @Delete(':id')
  @RequirePermission('user', 'delete')
  @ApiOperation({
    summary: 'Delete a user',
    description: 'GDPR-compliant deletion that removes all user data.',
  })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete self or last privileged user',
  })
  async deleteUser(
    @Param('id') userId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.userManagement.deleteUser(userId, req.user.userId);
  }

  @Post(':id/reset-password')
  @RequirePermission('user', 'update')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(
    @Param('id') userId: string,
    @Body() data: AdminResetPassword,
  ) {
    return this.userManagement.resetPassword(userId, data);
  }
}
