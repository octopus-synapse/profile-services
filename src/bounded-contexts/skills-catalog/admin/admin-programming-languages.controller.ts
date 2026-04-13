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
import { AdminProgrammingLanguagesService } from './admin-programming-languages.service';

@SdkExport({
  tag: 'admin-programming-languages',
  description: 'Admin Programming Languages API',
  requiresAuth: true,
})
@ApiTags('Admin - Programming Languages')
@ApiBearerAuth()
@RequirePermission(Permission.SKILL_MANAGE)
@Controller('v1/admin/programming-languages')
export class AdminProgrammingLanguagesController {
  constructor(private readonly service: AdminProgrammingLanguagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all programming languages' })
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

  @Get(':slug')
  @ApiOperation({ summary: 'Get programming language by slug' })
  async findOne(@Param('slug') slug: string) {
    const result = await this.service.findOne(slug);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Create programming language' })
  async create(@Body() dto: Record<string, unknown>) {
    const result = await this.service.create(dto);
    return { success: true, data: result };
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Update programming language' })
  async update(@Param('slug') slug: string, @Body() dto: Record<string, unknown>) {
    const result = await this.service.update(slug, dto);
    return { success: true, data: result };
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete programming language' })
  async remove(@Param('slug') slug: string) {
    await this.service.remove(slug);
  }
}
