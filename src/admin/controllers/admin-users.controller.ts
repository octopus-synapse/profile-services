/**
 * Admin Users Controller
 * Single Responsibility: Admin operations for user management
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
import { AdminService } from '../admin.service';
import type {
  AdminCreateUser,
  AdminUpdateUser,
  AdminResetPassword,
} from '@octopus-synapse/profile-contracts';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAllUsersWithPagination(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
  ) {
    return this.adminService.findAllUsersWithPagination({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      role,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID with full details (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByIdWithDetails(@Param('id') userId: string) {
    return this.adminService.findUserByIdWithDetails(userId);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUserAccount(@Body() createUserData: AdminCreateUser) {
    return this.adminService.createUserAccount(createUserData);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserAccount(
    @Param('id') userId: string,
    @Body() updateUserData: AdminUpdateUser,
  ) {
    return this.adminService.updateUserAccount(userId, updateUserData);
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Delete user with cascading deletion (Admin only)',
    description:
      'GDPR-compliant deletion that removes all user data including resumes, consents, and audit logs.',
  })
  @ApiResponse({
    status: 200,
    description: 'User and all related data deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete last admin account',
  })
  async deleteUserAccount(
    @Param('id') userId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.adminService.deleteUserAccount(userId, req.user.userId);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetUserPassword(
    @Param('id') userId: string,
    @Body() resetPasswordData: AdminResetPassword,
  ) {
    return this.adminService.resetUserPassword(userId, resetPasswordData);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getPlatformStatistics() {
    return this.adminService.getPlatformStatistics();
  }
}
