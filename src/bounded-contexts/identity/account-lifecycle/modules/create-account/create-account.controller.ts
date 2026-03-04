import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { CreateAccountPort } from '../../ports/inbound';
import { CREATE_ACCOUNT_PORT } from '../../ports/inbound';
import { CreateAccountDto, CreateAccountResponseDto } from './create-account.dto';

@ApiTags('Account Lifecycle')
@Controller('accounts')
export class CreateAccountController {
  constructor(
    @Inject(CREATE_ACCOUNT_PORT)
    private readonly createAccount: CreateAccountPort,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new account',
    description: 'Registers a new user account.',
  })
  @ApiDataResponse(CreateAccountResponseDto, {
    description: 'Account created successfully',
    status: HttpStatus.CREATED,
  })
  @ApiConflictResponse({
    description: 'Email already registered',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or weak password',
  })
  async handle(@Body() dto: CreateAccountDto): Promise<DataResponse<CreateAccountResponseDto>> {
    const result = await this.createAccount.execute({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });

    return {
      success: true,
      data: {
        userId: result.userId,
        email: result.email,
        message: 'Account created successfully.',
      },
    };
  }
}
