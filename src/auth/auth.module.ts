import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import {
  AuthCoreController,
  AuthVerificationController,
  AuthPasswordController,
  AuthAccountController,
  UserConsentController,
} from './controllers';
import { GdprController } from './controllers/gdpr.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { TosGuard } from './guards/tos.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../common/email/email.module';
import { LoggerModule } from '../common/logger/logger.module';
import { CacheModule } from '../common/cache/cache.module';
import { AdminModule } from '../admin/admin.module';
import {
  TokenService,
  PasswordService,
  VerificationTokenService,
  EmailVerificationService,
  PasswordResetService,
  AccountManagementService,
  AuthCoreService,
  TokenRefreshService,
  TokenBlacklistService,
  TosAcceptanceService,
} from './services';
import { GdprExportService } from './services/gdpr-export.service';
import { GdprDeletionService } from './services/gdpr-deletion.service';
import { AuditLogModule } from '../common/audit/audit-log.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    LoggerModule,
    CacheModule,
    AuditLogModule,
    forwardRef(() => AdminModule),
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
