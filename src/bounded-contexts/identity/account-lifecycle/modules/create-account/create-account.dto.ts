import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAccountDto {
  @ApiPropertyOptional({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (min 8 characters)',
    example: 'SecureP@ssw0rd!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class CreateAccountResponseDto {
  @ApiProperty({
    description: 'Created user ID',
    example: 'uuid-user-id',
  })
  userId: string;

  @ApiProperty({
    description: 'Registered email address',
    example: 'john@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Confirmation message',
    example: 'Account created successfully.',
  })
  message: string;
}
