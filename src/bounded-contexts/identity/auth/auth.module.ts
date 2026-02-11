import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '@/bounded-contexts/identity/users/users.module';
import { AuditLogModule } from '@/bounded-contexts/platform/common/audit/audit-log.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { EmailModule } from '@/bounded-contexts/platform/common/email/email.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AuthService } from './auth.service';
import {
  AuthAccountController,
  AuthCoreController,
  AuthPasswordController,
  AuthVerificationController,
  UserConsentController,
} from './controllers';
import { GdprController } from './controllers/gdpr.controller';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TosGuard } from './guards/tos.guard';
import {
  AccountManagementService,
  AuthCoreService,
  EmailVerificationService,
  PasswordResetService,
  PasswordService,
  TokenBlacklistService,
  TokenRefreshService,
  TokenService,
  TosAcceptanceService,
  VerificationTokenService,
} from './services';
import { GdprDeletionService } from './services/gdpr-deletion.service';
import { GdprExportService } from './services/gdpr-export.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    LoggerModule,
    CacheModule,
    AuditLogModule,
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required but not configured');
        }

        return {
          secret,
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN') ?? '7d',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthCoreController,
    AuthVerificationController,
    AuthPasswordController,
    AuthAccountController,
    UserConsentController,
    GdprController,
  ],
  providers: [
    // Core services
    TokenService,
    PasswordService,
    VerificationTokenService,
    TokenBlacklistService,
    // Feature services
    AuthCoreService,
    TokenRefreshService,
    EmailVerificationService,
    PasswordResetService,
    AccountManagementService,
    TosAcceptanceService,
    // GDPR services (#69, #70)
    GdprExportService,
    GdprDeletionService,
    // Facade
    AuthService,
    // Strategies
    JwtStrategy,
    LocalStrategy,
    // Global guards (GDPR compliance)
    // Order matters! JwtAuthGuard -> EmailVerifiedGuard -> TosGuard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: EmailVerifiedGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TosGuard,
    },
  ],
  exports: [
    AuthService,
    JwtModule,
    TokenService,
    PasswordService,
    TokenBlacklistService,
    GdprDeletionService,
    GdprExportService,
  ],
})
export class AuthModule {}
