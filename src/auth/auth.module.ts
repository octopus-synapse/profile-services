import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    LoggerModule,
    CacheModule,
    AdminModule,
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
  ],
})
export class AuthModule {}
