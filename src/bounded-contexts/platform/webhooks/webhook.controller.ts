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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { WebhookConfigService } from './webhook-config.service';

const SUPPORTED_EVENTS = ['resume.created', 'resume.published', 'ats.score.updated'] as const;

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1),
});
export class CreateWebhookDto extends createZodDto(CreateWebhookSchema) {}

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1).optional(),
  enabled: z.boolean().optional(),
});
export class UpdateWebhookDto extends createZodDto(UpdateWebhookSchema) {}

@SdkExport({ tag: 'webhooks', description: 'User-registered webhook subscriptions.' })
@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('v1/webhooks')
export class WebhookController {
  constructor(private readonly service: WebhookConfigService) {}

  @Get()
  @RequirePermission(Permission.RESUME_READ)
  @ApiOperation({ summary: 'List webhooks registered by the current user.' })
  async list(@CurrentUser() user: UserPayload): Promise<DataResponse<{ webhooks: unknown[] }>> {
    const webhooks = await this.service.listForUser(user.userId);
    return { success: true, data: { webhooks } };
  }

  @Post()
  @RequirePermission(Permission.RESUME_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new webhook subscription.' })
  async create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<{ webhook: unknown; secret: string }>> {
    const result = await this.service.createForUser(user.userId, dto);
    return { success: true, data: result };
  }

  @Patch(':id')
  @RequirePermission(Permission.RESUME_UPDATE)
  @ApiOperation({ summary: 'Update a webhook subscription.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<{ webhook: unknown }>> {
    const webhook = await this.service.updateForUser(user.userId, id, dto);
    return { success: true, data: { webhook } };
  }

  @Delete(':id')
  @RequirePermission(Permission.RESUME_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook subscription.' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserPayload): Promise<void> {
    await this.service.deleteForUser(user.userId, id);
  }

  @Get(':id/deliveries')
  @RequirePermission(Permission.RESUME_READ)
  @ApiOperation({ summary: 'List recent delivery attempts for a webhook.' })
  async deliveries(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<{ deliveries: unknown[] }>> {
    const deliveries = await this.service.listDeliveries(user.userId, id);
    return { success: true, data: { deliveries } };
  }
}
