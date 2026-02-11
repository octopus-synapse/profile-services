/**
 * Enums Controller
 *
 * Exposes domain enums through API endpoints.
 * This ensures enums appear in OpenAPI/Swagger for frontend SDK generation.
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { ExportFormatResponseDto, UserRoleResponseDto } from '@/shared-kernel/dtos/enums.dto';

@SdkExport({ tag: 'enums', description: 'Domain Enums API' })
@ApiTags('enums')
@Controller('v1/enums')
export class EnumsController {
  @Public()
  @Get('export-formats')
  @ApiOperation({
    summary: 'Get available export formats',
    description: 'Returns all available export formats for resume export',
  })
  @ApiResponse({
    status: 200,
    description: 'List of export formats',
    type: [ExportFormatResponseDto],
  })
  getExportFormats(): ExportFormatResponseDto[] {
    return [{ format: 'PDF' }, { format: 'DOCX' }, { format: 'JSON' }];
  }

  @Public()
  @Get('user-roles')
  @ApiOperation({
    summary: 'Get available user roles',
    description: 'Returns all available user roles in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user roles',
    type: [UserRoleResponseDto],
  })
  getUserRoles(): UserRoleResponseDto[] {
    return [{ role: 'USER' }, { role: 'ADMIN' }, { role: 'APPROVER' }];
  }
}
