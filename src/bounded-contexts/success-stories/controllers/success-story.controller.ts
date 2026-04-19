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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { CreateSuccessStoryDto, UpdateSuccessStoryDto } from '../dto/success-story-request.dto';
import { type PublicSuccessStory, SuccessStoryService } from '../services/success-story.service';

@SdkExport({
  tag: 'success-stories',
  description: 'Success stories — public carousel + admin CRUD',
})
@ApiTags('success-stories')
@Controller('v1/success-stories')
export class SuccessStoryController {
  constructor(private readonly service: SuccessStoryService) {}

  /**
   * Public carousel feed. Returns published stories only. No auth required
   * so the landing page can SSR them without leaking JWT handling.
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Published success stories for the landing carousel.' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listPublic(
    @Query('limit') limit?: number,
  ): Promise<DataResponse<{ stories: PublicSuccessStory[] }>> {
    const stories = await this.service.listPublished(limit ? Number(limit) : undefined);
    return { success: true, data: { stories } };
  }

  // --- Admin-only mutations ---

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermission(Permission.ADMIN_FULL_ACCESS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a success story (admin).' })
  @ApiBody({ type: CreateSuccessStoryDto })
  async create(@Body() body: CreateSuccessStoryDto): Promise<DataResponse<{ id: string }>> {
    const created = await this.service.create(body);
    return { success: true, data: { id: created.id } };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermission(Permission.ADMIN_FULL_ACCESS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a success story (admin).' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateSuccessStoryDto })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateSuccessStoryDto,
  ): Promise<DataResponse<{ id: string }>> {
    const updated = await this.service.update(id, body);
    return { success: true, data: { id: updated.id } };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermission(Permission.ADMIN_FULL_ACCESS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a success story (admin).' })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(@Param('id') id: string): Promise<DataResponse<{ id: string }>> {
    await this.service.delete(id);
    return { success: true, data: { id } };
  }
}
