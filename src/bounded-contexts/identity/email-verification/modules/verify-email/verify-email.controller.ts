import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { VerifyEmailPort } from '../../ports/inbound';
import { VERIFY_EMAIL_PORT } from '../../ports/inbound';
import { VerifyEmailDto, VerifyEmailResponseDto } from './verify-email.dto';

@SdkExport({ tag: 'email-verification', description: 'Email verification' })
@ApiTags('Email Verification')
@Controller('email-verification')
export class VerifyEmailController {
  constructor(
    @Inject(VERIFY_EMAIL_PORT)
    private readonly verifyEmail: VerifyEmailPort,
  ) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email with token',
    description: 'Verifies the user email using the token received via email.',
  })
  @ApiDataResponse(VerifyEmailResponseDto, {
    description: 'Email verified successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token',
  })
  async handle(@Body() dto: VerifyEmailDto): Promise<DataResponse<VerifyEmailResponseDto>> {
    const result = await this.verifyEmail.execute({ token: dto.token });

    return {
      success: true,
      data: {
        email: result.email,
        message: 'Email has been verified successfully.',
      },
    };
  }
}
