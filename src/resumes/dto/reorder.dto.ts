import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderDto {
  @ApiProperty({
    description: 'Array of IDs in the desired order',
    example: ['cuid1', 'cuid2', 'cuid3'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  ids: string[];
}
