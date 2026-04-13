import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminSpokenLanguagesService } from './admin-spoken-languages.service';

@SdkExport({
  tag: 'admin-spoken-languages',
  description: 'Admin Spoken Languages API',
  requiresAuth: true,
})
@ApiTags('Admin - Spoken Languages')
@ApiBearerAuth()
@RequirePermission(Permission.SKILL_MANAGE)
@Controller('v1/admin/spoken-languages')
export class AdminSpokenLanguagesController {
  constructor(private readonly service: AdminSpokenLanguagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all spoken languages' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    const result = await this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      isActive: isActive !== undefined ? String(isActive) === 'true' : undefined,
    });
    return { success: true, data: result };
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get spoken language by code' })
  async findOne(@Param('code') code: string) {
    const result = await this.service.findOne(code);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Create spoken language' })
  async create(@Body() dto: Record<string, unknown>) {
    const result = await this.service.create(dto);
    return { success: true, data: result };
  }

  @Patch(':code')
  @ApiOperation({ summary: 'Update spoken language' })
  async update(@Param('code') code: string, @Body() dto: Record<string, unknown>) {
    const result = await this.service.update(code, dto);
    return { success: true, data: result };
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete spoken language' })
  async remove(@Param('code') code: string) {
    await this.service.remove(code);
  }
}
