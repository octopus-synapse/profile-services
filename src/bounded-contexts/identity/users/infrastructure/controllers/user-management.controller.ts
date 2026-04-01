/**
 * User Management Controller
 *
 * Endpoints for managing users (CRUD operations).
 * Protected by permission system - any role with required permissions can access.
 *
 * Single Responsibility: HTTP interface for user management operations.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type {
  CreatedUser,
  UpdatedUser,
  UserDetails,
  UserListItem,
} from '../../application/ports/user-management.port';
import { UserManagementService } from '../../application/services/user-management.service';
import {
  AdminCreateUserDto,
  AdminResetPasswordDto,
  AdminUpdateUserDto,
} from '../../dto/controller-request.dto';
import {
  UserDetailsDataDto,
  UserManagementListDataDto,
  UserMutationDataDto,
  UserOperationMessageDataDto,
} from '../../dto/controller-response.dto';

@SdkExport({ tag: 'users', description: 'Users API' })
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('v1/users/manage')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserManagementController {
  constructor(private readonly userManagement: UserManagementService) {}

  /**
   * Map UserListItem with Date fields to API response format (ISO strings)
   */
  private mapUserListItem(user: UserListItem) {
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      emailVerified: user.emailVerified?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }

  /**
   * Map UserDetails with Date fields to API response format (ISO strings)
   */
  private mapUserDetails(user: UserDetails) {
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      emailVerified: user.emailVerified?.toISOString() ?? null,
      resumes: user.resumes.map((resume) => ({
        ...resume,
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * Map CreatedUser with Date fields to API response format (ISO strings)
   */
  private mapCreatedUser(user: CreatedUser) {
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Map UpdatedUser with Date fields to API response format (ISO strings)
   */
  private mapUpdatedUser(user: UpdatedUser) {
    return {
      ...user,
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  @Get()
  @RequirePermission('user', 'read')
  @ApiOperation({ summary: 'List all users with pagination' })
  @ApiDataResponse(UserManagementListDataDto, {
    description: 'Users retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'roleName', required: false, type: String })
  async listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('roleName') roleName?: string,
  ): Promise<DataResponse<UserManagementListDataDto>> {
    const result = await this.userManagement.listUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      roleName,
    });

    return {
      success: true,
      data: {
        users: result.users.map((user) => this.mapUserListItem(user)),
        pagination: result.pagination,
      },
    };
  }

  @Get(':id')
  @RequirePermission('user', 'read')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiDataResponse(UserDetailsDataDto, {
    description: 'User retrieved successfully',
  })
  async getUserDetails(@Param('id') userId: string): Promise<DataResponse<UserDetailsDataDto>> {
    const user = await this.userManagement.getUserDetails(userId);
    return { success: true, data: { user: this.mapUserDetails(user) } };
  }

  @Post()
  @RequirePermission('user', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiDataResponse(UserMutationDataDto, {
    description: 'User created successfully',
    status: HttpStatus.CREATED,
  })
  async createUser(@Body() data: AdminCreateUserDto): Promise<DataResponse<UserMutationDataDto>> {
    const result = await this.userManagement.createUser(data);
    return {
      success: true,
      data: {
        user: this.mapCreatedUser(result),
        message: 'User created successfully',
      },
    };
  }

  @Patch(':id')
  @RequirePermission('user', 'update')
  @ApiOperation({ summary: 'Update user information' })
  @ApiDataResponse(UserMutationDataDto, {
    description: 'User updated successfully',
  })
  async updateUser(
    @Param('id') userId: string,
    @Body() data: AdminUpdateUserDto,
  ): Promise<DataResponse<UserMutationDataDto>> {
    const result = await this.userManagement.updateUser(userId, data);
    return {
      success: true,
      data: {
        user: this.mapUpdatedUser(result),
        message: 'User updated successfully',
      },
    };
  }

  @Delete(':id')
  @RequirePermission('user', 'delete')
  @ApiOperation({
    summary: 'Delete a user',
    description: 'GDPR-compliant deletion that removes all user data.',
  })
  @ApiDataResponse(UserOperationMessageDataDto, {
    description: 'User deleted successfully',
  })
  async deleteUser(
    @Param('id') userId: string,
    @Req() req: { user: { userId: string } },
  ): Promise<DataResponse<UserOperationMessageDataDto>> {
    await this.userManagement.deleteUser(userId, req.user.userId);
    return { success: true, data: { message: 'User deleted successfully' } };
  }

  @Post(':id/reset-password')
  @RequirePermission('user', 'update')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiDataResponse(UserOperationMessageDataDto, {
    description: 'Password reset successfully',
  })
  async resetPassword(
    @Param('id') userId: string,
    @Body() data: AdminResetPasswordDto,
  ): Promise<DataResponse<UserOperationMessageDataDto>> {
    await this.userManagement.resetPassword(userId, data);
    return { success: true, data: { message: 'Password reset successfully' } };
  }
}
