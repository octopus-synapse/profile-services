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
import { SuccessStoriesUseCases } from '../../application/ports/success-stories.port';
import { CreateSuccessStoryDto, UpdateSuccessStoryDto } from '../../dto/success-story-request.dto';

/** Response shape the public carousel renders — kept at the HTTP boundary
 *  to avoid leaking domain entity types across layers. */
type PublicSuccessStoryResponse = {
  id: string;
  userId: string;
  headline: string;
  beforeText: string;
  afterText: string;
  quote: string;
  timeframeDays: number | null;
  publishedAt: string | null;
  user: { name: string | null; username: string | null; photoURL: string | null };
};

@SdkExport({
  tag: 'success-stories',
  description: 'Success stories — public carousel + admin CRUD',
})
@ApiTags('success-stories')
@Controller('v1/success-stories')
export class SuccessStoryController {
  constructor(private readonly bc: SuccessStoriesUseCases) {}

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
  ): Promise<DataResponse<{ stories: PublicSuccessStoryResponse[] }>> {
    const stories = await this.bc.listPublished.execute(limit ? Number(limit) : undefined);
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
    const created = await this.bc.create.execute(body);
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
    const updated = await this.bc.update.execute(id, body);
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
    await this.bc.delete.execute(id);
    return { success: true, data: { id } };
  }
}
