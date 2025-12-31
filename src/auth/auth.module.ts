import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  AuthCoreController,
  AuthVerificationController,
  AuthPasswordController,
  AuthAccountController,
} from './controllers';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../common/email/email.module';
import { LoggerModule } from '../common/logger/logger.module';
import {
  TokenService,
  PasswordService,
  VerificationTokenService,
  EmailVerificationService,
  PasswordResetService,
  AccountManagementService,
  AuthCoreService,
  TokenRefreshService,
} from './services';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    LoggerModule,
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
  ],
  providers: [
    // Core services
    TokenService,
    PasswordService,
    VerificationTokenService,
    // Feature services
    AuthCoreService,
    TokenRefreshService,
    EmailVerificationService,
    PasswordResetService,
    AccountManagementService,
    // Facade
    AuthService,
    // Strategies
    JwtStrategy,
    LocalStrategy,
  ],
  exports: [AuthService, JwtModule, TokenService, PasswordService],
})
export class AuthModule {}
