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
import { CreateSuccessStoryUseCase } from '../../application/use-cases/create-success-story/create-success-story.use-case';
import { DeleteSuccessStoryUseCase } from '../../application/use-cases/delete-success-story/delete-success-story.use-case';
import { ListPublishedSuccessStoriesUseCase } from '../../application/use-cases/list-published-success-stories/list-published-success-stories.use-case';
import { UpdateSuccessStoryUseCase } from '../../application/use-cases/update-success-story/update-success-story.use-case';
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
  constructor(
    private readonly listPublishedUseCase: ListPublishedSuccessStoriesUseCase,
    private readonly createUseCase: CreateSuccessStoryUseCase,
    private readonly updateUseCase: UpdateSuccessStoryUseCase,
    private readonly deleteUseCase: DeleteSuccessStoryUseCase,
  ) {}

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
    const stories = await this.listPublishedUseCase.execute(limit ? Number(limit) : undefined);
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
    const created = await this.createUseCase.execute(body);
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
    const updated = await this.updateUseCase.execute(id, body);
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
    await this.deleteUseCase.execute(id);
    return { success: true, data: { id } };
  }
}
