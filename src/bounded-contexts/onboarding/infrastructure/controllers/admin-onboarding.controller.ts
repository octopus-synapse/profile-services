import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { AdminOnboardingService } from '../services/admin-onboarding.service';

@ApiTags('Admin - Onboarding')
@ApiBearerAuth()
@RequirePermission(Permission.SECTION_TYPE_MANAGE)
@Controller('v1/admin/onboarding')
export class AdminOnboardingController {
  constructor(private readonly service: AdminOnboardingService) {}

  @Get('steps')
  @ApiOperation({ summary: 'List all onboarding steps' })
  async listSteps() {
    const steps = await this.service.listSteps();
    return { steps };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get onboarding funnel statistics' })
  async getStats() {
    const stats = await this.service.getStats();
    return { stats };
  }

  @Get('steps/:key')
  @ApiOperation({ summary: 'Get onboarding step by key' })
  @ApiParam({ name: 'key', type: String })
  async getStep(@Param('key') key: string) {
    const step = await this.service.getStep(key);
    if (!step) return { success: false, message: 'Step not found' };
    return { step };
  }

  @Post('steps')
  @ApiOperation({ summary: 'Create onboarding step' })
  async createStep(@Body() body: Record<string, unknown>) {
    const step = await this.service.createStep(body);
    return { step };
  }

  @Put('steps/:key')
  @ApiOperation({ summary: 'Update onboarding step' })
  @ApiParam({ name: 'key', type: String })
  async updateStep(@Param('key') key: string, @Body() body: Record<string, unknown>) {
    const step = await this.service.updateStep(key, body);
    return { step };
  }

  @Delete('steps/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete onboarding step' })
  @ApiParam({ name: 'key', type: String })
  async deleteStep(@Param('key') key: string) {
    await this.service.deleteStep(key);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get onboarding config (strength levels)' })
  async getConfig() {
    const config = await this.service.getConfig();
    return { config };
  }

  @Put('config')
  @ApiOperation({ summary: 'Update onboarding config' })
  async updateConfig(@Body() body: Record<string, unknown>) {
    const config = await this.service.updateConfig(body);
    return { config };
  }
}
