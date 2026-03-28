import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { CreateSessionPort } from '@/bounded-contexts/identity/authentication/ports/inbound';
import { CREATE_SESSION_PORT } from '@/bounded-contexts/identity/authentication/ports/inbound';
import type {
  CookieWriter,
  SessionCookieOptions,
} from '@/bounded-contexts/identity/authentication/ports/outbound/session-storage.port';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ZodValidationPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import type { CreateAccountPort } from '../../ports/inbound';
import { CREATE_ACCOUNT_PORT } from '../../ports/inbound';
import {
  CreateAccountDto,
  CreateAccountResponseDto,
  CreateAccountSchema,
} from './create-account.dto';

/**
 * Creates a CookieWriter adapter from Express Response
 * Bridges infrastructure (Express) to domain abstraction
 */
function createCookieWriter(res: Response): CookieWriter {
  return {
    setCookie: (name: string, value: string, options: SessionCookieOptions) => {
      res.cookie(name, value, {
        ...options,
        expires: new Date(Date.now() + options.maxAge),
      });
    },
    clearCookie: (name: string, options: Partial<SessionCookieOptions>) => {
      res.clearCookie(name, options);
    },
  };
}

@SdkExport({ tag: 'accounts', description: 'Account creation - signup' })
@ApiTags('accounts')
@Controller('accounts')
export class CreateAccountController {
  constructor(
    @Inject(CREATE_ACCOUNT_PORT)
    private readonly createAccountService: CreateAccountPort,
    @Inject(CREATE_SESSION_PORT)
    private readonly createSessionService: CreateSessionPort,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'accounts_signup',
    summary: 'Create new account',
    description: 'Registers a new user account and returns auth tokens for auto-login.',
  })
  @ApiDataResponse(CreateAccountResponseDto, {
    description: 'Account created successfully with auth tokens',
    status: HttpStatus.CREATED,
  })
  @ApiConflictResponse({
    description: 'Email already registered',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or weak password',
  })
  async signup(
    @Body(new ZodValidationPipe(CreateAccountSchema)) dto: CreateAccountDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DataResponse<CreateAccountResponseDto>> {
    const result = await this.createAccountService.execute({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });

    // Set session cookie for cookie-based auth (same as login)
    await this.createSessionService.execute({
      userId: result.userId,
      email: result.email,
      cookieWriter: createCookieWriter(res),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      data: {
        userId: result.userId,
        email: result.email,
        message: 'Account created successfully.',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      },
    };
  }
}
