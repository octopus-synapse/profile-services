/**
 * Upload SDK Response DTOs
 *
 * Response types for file and image uploads.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty({ example: 'https://cdn.example.com/files/abc123.pdf' })
  url!: string;

  @ApiProperty({ example: 'abc123.pdf' })
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  contentType!: string;

  @ApiProperty({ example: 102400 })
  size!: number;
}

export class ImageUploadResponseDto extends FileUploadResponseDto {
  @ApiPropertyOptional({ example: 800 })
  width?: number;

  @ApiPropertyOptional({ example: 600 })
  height?: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/thumbs/abc123.jpg' })
  thumbnailUrl?: string;
}
