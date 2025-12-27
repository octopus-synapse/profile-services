import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger/logger.service';
import { EmailService } from '../common/email/email.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  RequestVerificationDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/verification.dto';
import {
  APP_CONSTANTS,
  ERROR_MESSAGES,
} from '../common/constants/app.constants';

// Type for a user object without the password field
type ValidatedUser = Omit<User, 'password'>;
// Type for the user data we encode in the JWT
type JwtUserPayload = Pick<User, 'id' | 'email' | 'role' | 'hasCompletedOnboarding'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly logger: AppLoggerService,
    private readonly emailService: EmailService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn(`Signup attempt for existing email`, 'AuthService', {
        email,
      });
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(
      password,
      APP_CONSTANTS.BCRYPT_ROUNDS,
    );

    const user = await this.prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        hasCompletedOnboarding: false,
      },
    });

    this.logger.log(`User registered successfully`, 'AuthService', {
      userId: user.id,
      email,
    });

    const token = this.generateToken({
      id: user.id,
      email: user.email!, // email is non-null after creation
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        username: user.username,
        image: user.image,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
      token,
    };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      this.logger.warn(`Failed login attempt - user not found`, 'AuthService', {
        email,
      });
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(
        `Failed login attempt - invalid password`,
        'AuthService',
        { email },
      );
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email!, // email is non-null for a validated user
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    this.logger.log(`User logged in successfully`, 'AuthService', {
      userId: user.id,
      email: user.email,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        username: user.username,
        image: user.image,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
      token,
    };
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hasCompletedOnboarding: true,
      },
    });

    if (!user || !user.email) {
      this.logger.warn(`Token refresh failed - user not found`, 'AuthService', {
        userId,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    this.logger.debug(`Token refreshed`, 'AuthService', { userId });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    };
  }

  private generateToken(user: JwtUserPayload): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
    };

    return this.jwtService.sign(payload);
  }

  // ==================== Email Verification ====================

  async requestEmailVerification(dto: RequestVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return {
        success: true,
        message: 'If the email exists, a verification link has been sent',
      };
    }

    if (user.emailVerified) {
      return { success: true, message: 'Email is already verified' };
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await this.prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: dto.email,
          token: token,
        },
      },
      update: {
        token,
        expires,
      },
      create: {
        identifier: dto.email,
        token,
        expires,
      },
    });

    this.logger.log(`Verification token created`, 'AuthService', {
      email: dto.email,
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        dto.email,
        user.name || 'Usuário',
        token,
      );
    } catch (error) {
      this.logger.error(
        'Failed to send verification email',
        error instanceof Error ? error.stack : 'Unknown error',
        'AuthService',
      );
      // Don't fail the request if email fails
    }

    return {
      success: true,
      message: 'Verification email sent',
      // Remove token from response in production
      ...(process.env.NODE_ENV !== 'production' && { token }),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await this.prisma.verificationToken.delete({
        where: { token: dto.token },
      });
      throw new BadRequestException('Verification token has expired');
    }

    // Update user's email verification status
    await this.prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    // Delete the used token
    await this.prisma.verificationToken.delete({
      where: { token: dto.token },
    });

    this.logger.log(`Email verified successfully`, 'AuthService', {
      email: verificationToken.identifier,
    });

    // Send welcome email
    const user = await this.prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (user) {
      try {
        await this.emailService.sendWelcomeEmail(
          user.email!,
          user.name || 'Usuário',
        );
      } catch (error) {
        this.logger.error(
          'Failed to send welcome email',
          error instanceof Error ? error.stack : 'Unknown error',
          'AuthService',
        );
        // Don't fail the request if email fails
      }
    }

    return { success: true, message: 'Email verified successfully' };
  }

  // ==================== Password Reset ====================

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Store reset token (using verification token table with different identifier prefix)
    await this.prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: `reset:${dto.email}`,
          token: token,
        },
      },
      update: {
        token,
        expires,
      },
      create: {
        identifier: `reset:${dto.email}`,
        token,
        expires,
      },
    });

    this.logger.log(`Password reset token created`, 'AuthService', {
      email: dto.email,
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email!,
        user.name || 'Usuário',
        token,
      );
    } catch (error) {
      this.logger.error(
        'Failed to send password reset email',
        error instanceof Error ? error.stack : 'Unknown error',
        'AuthService',
      );
      // Don't fail the request if email fails
    }

    return {
      success: true,
      message: 'Password reset email sent',
      // Remove token from response in production
      ...(process.env.NODE_ENV !== 'production' && { token }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (
      !verificationToken ||
      !verificationToken.identifier.startsWith('reset:')
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (verificationToken.expires < new Date()) {
      await this.prisma.verificationToken.delete({
        where: { token: dto.token },
      });
      throw new BadRequestException('Reset token has expired');
    }

    const email = verificationToken.identifier.replace('reset:', '');
    const hashedPassword = await bcrypt.hash(
      dto.password,
      APP_CONSTANTS.BCRYPT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Delete the used token
    await this.prisma.verificationToken.delete({
      where: { token: dto.token },
    });

    this.logger.log(`Password reset successfully`, 'AuthService', { email });

    return { success: true, message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      APP_CONSTANTS.BCRYPT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.logger.log(`Password changed successfully`, 'AuthService', { userId });

    // Send password changed notification email
    try {
      await this.emailService.sendPasswordChangedEmail(
        user.email!,
        user.name || 'Usuário',
      );
    } catch (error) {
      this.logger.error(
        'Failed to send password changed email',
        error instanceof Error ? error.stack : 'Unknown error',
        'AuthService',
      );
      // Don't fail the request if email fails
    }

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Change user email
   */
  async changeEmail(userId: string, dto: any) {
    const { newEmail, currentPassword } = dto;

    // Get user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new email is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Update email
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailVerified: null, // Reset verification
      },
    });

    this.logger.log(`Email changed for user`, 'AuthService', { userId });

    return {
      success: true,
      message: 'Email changed successfully. Please verify your new email.',
    };
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, dto: any) {
    const { password } = dto;

    // Get user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Prevent deleting admin if they're the last one
    if (user.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last admin account',
        );
      }
    }

    // Delete user (cascade will delete related data)
    await this.prisma.user.delete({ where: { id: userId } });

    this.logger.log(`Account deleted`, 'AuthService', { userId });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }
}
