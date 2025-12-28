import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../common/enums/user-role.enum';
import * as bcrypt from 'bcryptjs';

interface GetAllUsersOptions {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers(options: GetAllUsersOptions) {
    const { page, limit, search, role } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          hasCompletedOnboarding: true,
          createdAt: true,
          updatedAt: true,
          image: true,
          emailVerified: true,
          _count: {
            select: {
              resumes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        resumes: {
          select: {
            id: true,
            title: true,
            template: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        preferences: true,
        _count: {
          select: {
            accounts: true,
            sessions: true,
            resumes: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Don't return password
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async createUser(createUserDto: CreateUserDto) {
    const { email, password, name, role } = createUserDto;

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || UserRole.USER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      user,
      message: 'User created successfully',
    };
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If updating email, check if new email is already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // If updating username, check if new username is already taken
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateUserDto.username },
      });

      if (existingUser) {
        throw new ConflictException('Username already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        hasCompletedOnboarding: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      user: updatedUser,
      message: 'User updated successfully',
    };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting the last admin
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin user');
      }
    }

    await this.prisma.user.delete({ where: { id } });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  async resetUserPassword(id: string, resetPasswordDto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    const hashedPassword = await bcrypt.hash(
      resetPasswordDto.newPassword,
      saltRounds,
    );

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async getStats() {
    const [
      totalUsers,
      totalAdmins,
      totalResumes,
      usersWithOnboarding,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.resume.count(),
      this.prisma.user.count({ where: { hasCompletedOnboarding: true } }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        regular: totalUsers - totalAdmins,
        withOnboarding: usersWithOnboarding,
        recentSignups: recentUsers,
      },
      resumes: {
        total: totalResumes,
      },
    };
  }

  // ==================== Resume Management ====================

  async getUserResumes(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      include: {
        skills: true,
        experiences: true,
        education: true,
        _count: {
          select: {
            skills: true,
            experiences: true,
            education: true,
            projects: true,
            certifications: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { resumes };
  }

  async getResumeById(resumeId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        skills: { orderBy: { order: 'asc' } },
        experiences: { orderBy: { order: 'asc' } },
        education: { orderBy: { order: 'asc' } },
        projects: { orderBy: { order: 'asc' } },
        certifications: { orderBy: { order: 'asc' } },
        languages: { orderBy: { order: 'asc' } },
        awards: { orderBy: { order: 'asc' } },
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  async deleteResume(resumeId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    await this.prisma.resume.delete({ where: { id: resumeId } });

    return {
      success: true,
      message: 'Resume deleted successfully',
    };
  }

  // ==================== Skills Management ====================

  async getResumeSkills(resumeId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const skills = await this.prisma.skill.findMany({
      where: { resumeId },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });

    return { skills };
  }

  async addSkillToResume(
    resumeId: string,
    data: { name: string; category: string; level?: number },
  ) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Get the highest order number for this resume's skills
    const lastSkill = await this.prisma.skill.findFirst({
      where: { resumeId },
      orderBy: { order: 'desc' },
    });

    const skill = await this.prisma.skill.create({
      data: {
        resumeId,
        name: data.name,
        category: data.category,
        level: data.level,
        order: (lastSkill?.order ?? -1) + 1,
      },
    });

    return {
      success: true,
      skill,
      message: 'Skill added successfully',
    };
  }

  async updateSkill(
    skillId: string,
    data: { name?: string; category?: string; level?: number },
  ) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const updatedSkill = await this.prisma.skill.update({
      where: { id: skillId },
      data,
    });

    return {
      success: true,
      skill: updatedSkill,
      message: 'Skill updated successfully',
    };
  }

  async deleteSkill(skillId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    await this.prisma.skill.delete({ where: { id: skillId } });

    return {
      success: true,
      message: 'Skill deleted successfully',
    };
  }
}
