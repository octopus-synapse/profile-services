import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
  ) {
    return this.adminService.getAllUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      role,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID with full details (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetUserPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.adminService.resetUserPassword(id, resetPasswordDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getStats() {
    return this.adminService.getStats();
  }

  // ==================== Resume Management ====================

  @Get('users/:userId/resumes')
  @ApiOperation({ summary: 'Get all resumes for a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserResumes(@Param('userId') userId: string) {
    return this.adminService.getUserResumes(userId);
  }

  @Get('resumes/:resumeId')
  @ApiOperation({ summary: 'Get resume by ID with all details (Admin only)' })
  @ApiResponse({ status: 200, description: 'Resume retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResumeById(@Param('resumeId') resumeId: string) {
    return this.adminService.getResumeById(resumeId);
  }

  @Delete('resumes/:resumeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete resume (Admin only)' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async deleteResume(@Param('resumeId') resumeId: string) {
    return this.adminService.deleteResume(resumeId);
  }

  // ==================== Skills Management ====================

  @Get('resumes/:resumeId/skills')
  @ApiOperation({ summary: 'Get all skills for a resume (Admin only)' })
  @ApiResponse({ status: 200, description: 'Skills retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResumeSkills(@Param('resumeId') resumeId: string) {
    return this.adminService.getResumeSkills(resumeId);
  }

  @Post('resumes/:resumeId/skills')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add skill to resume (Admin only)' })
  @ApiResponse({ status: 201, description: 'Skill added successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async addSkillToResume(
    @Param('resumeId') resumeId: string,
    @Body() skillData: { name: string; category: string; level?: number },
  ) {
    return this.adminService.addSkillToResume(resumeId, skillData);
  }

  @Patch('skills/:skillId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update skill (Admin only)' })
  @ApiResponse({ status: 200, description: 'Skill updated successfully' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async updateSkill(
    @Param('skillId') skillId: string,
    @Body() skillData: { name?: string; category?: string; level?: number },
  ) {
    return this.adminService.updateSkill(skillId, skillData);
  }

  @Delete('skills/:skillId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete skill (Admin only)' })
  @ApiResponse({ status: 200, description: 'Skill deleted successfully' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async deleteSkill(@Param('skillId') skillId: string) {
    return this.adminService.deleteSkill(skillId);
  }
}
