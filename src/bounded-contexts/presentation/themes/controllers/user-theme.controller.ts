/**
 * User Theme Routes
 * Requires authentication
 */

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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { CreateThemeDto } from '@/shared-kernel';
import type { ApplyThemeToResume, ForkTheme, UpdateTheme } from '@/shared-kernel';
import {
  ThemeApplyDataDto,
  ThemeEntityDataDto,
  ThemeListDataDto,
  ThemeResolvedConfigDataDto,
} from '../dto/controller-response.dto';
import { ThemeApplicationService, ThemeCrudService, ThemeQueryService } from '../services';

class CreateThemeRequestDto {
  @ApiProperty({ minLength: 3, maxLength: 50 })
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  description?: string;

  @ApiProperty()
  category!: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'string' } })
  tags?: string[];

  @ApiProperty({ type: 'object', additionalProperties: true })
  styleConfig!: Record<string, unknown>;

  @ApiPropertyOptional()
  parentThemeId?: string;
}

class UpdateThemeRequestDto extends PartialType(CreateThemeRequestDto) {}

class ForkThemeRequestDto {
  @ApiProperty()
  themeId!: string;

  @ApiProperty({ minLength: 3, maxLength: 50 })
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  description?: string;
}

class ApplyThemeToResumeRequestDto {
  @ApiProperty()
  resumeId!: string;

  @ApiProperty()
  themeId!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  customizations?: Record<string, unknown>;
}

@SdkExport({ tag: 'themes', description: 'Themes API' })
@ApiTags('themes')
@Controller('v1/themes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserThemeController {
  constructor(
    private crudService: ThemeCrudService,
    private queryService: ThemeQueryService,
    private appService: ThemeApplicationService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my themes' })
  @ApiDataResponse(ThemeListDataDto, { description: 'User themes returned' })
  async getAllThemesByUser(
    @CurrentUser('userId') userId: string,
  ): Promise<DataResponse<ThemeListDataDto>> {
    const themes = await this.queryService.findAllThemesByUser(userId);
    return { success: true, data: { themes } };
  }

  @Post()
  @ApiOperation({ summary: 'Create theme' })
  @ApiBody({ type: CreateThemeRequestDto })
  @ApiDataResponse(ThemeEntityDataDto, {
    description: 'Theme created successfully',
    status: HttpStatus.CREATED,
  })
  async createThemeForUser(
    @CurrentUser('userId') userId: string,
    @Body() themeData: CreateThemeDto,
  ): Promise<DataResponse<ThemeEntityDataDto>> {
    const theme = await this.crudService.createThemeForUser(userId, themeData);
    return { success: true, data: { theme } };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update theme' })
  @ApiBody({ type: UpdateThemeRequestDto })
  @ApiDataResponse(ThemeEntityDataDto, {
    description: 'Theme updated successfully',
  })
  async updateThemeForUser(
    @CurrentUser('userId') userId: string,
    @Param('id') themeId: string,
    @Body() updateThemeData: UpdateTheme,
  ): Promise<DataResponse<ThemeEntityDataDto>> {
    const theme = await this.crudService.updateThemeForUser(userId, themeId, updateThemeData);
    return { success: true, data: { theme } };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete theme' })
  @ApiEmptyDataResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Theme deleted successfully',
  })
  async deleteThemeForUser(
    @CurrentUser('userId') userId: string,
    @Param('id') themeId: string,
  ): Promise<void> {
    await this.crudService.deleteThemeForUser(userId, themeId);
  }

  @Post('fork')
  @ApiOperation({ summary: 'Fork a theme' })
  @ApiBody({ type: ForkThemeRequestDto })
  @ApiDataResponse(ThemeEntityDataDto, {
    description: 'Theme forked successfully',
  })
  async fork(
    @CurrentUser('userId') userId: string,
    @Body() dto: ForkTheme,
  ): Promise<DataResponse<ThemeEntityDataDto>> {
    const forkedTheme = await this.appService.forkThemeForUser(userId, dto);
    return { success: true, data: { theme: forkedTheme } };
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply theme to resume' })
  @ApiBody({ type: ApplyThemeToResumeRequestDto })
  @ApiDataResponse(ThemeApplyDataDto, {
    description: 'Theme applied to resume',
  })
  async apply(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyThemeToResume,
  ): Promise<DataResponse<ThemeApplyDataDto>> {
    await this.appService.applyToResume(userId, dto);
    return {
      success: true,
      data: {
        success: true,
      },
    };
  }

  @Get('resume/:resumeId/config')
  @ApiOperation({ summary: 'Get resolved config for resume' })
  @ApiDataResponse(ThemeResolvedConfigDataDto, {
    description: 'Resolved theme config returned',
  })
  async getResolvedConfig(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
  ): Promise<DataResponse<ThemeResolvedConfigDataDto>> {
    const config = await this.appService.getResolvedConfig(resumeId, userId);
    return { success: true, data: { config } };
  }
}
