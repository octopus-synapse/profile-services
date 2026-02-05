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
import { ThemeResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import {
  ThemeCrudService,
  ThemeQueryService,
  ThemeApplicationService,
} from '../services';
import type {
  CreateTheme,
  UpdateTheme,
  ForkTheme,
  ApplyThemeToResume,
} from '@/shared-kernel';

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
  getAllThemesByUser(@CurrentUser('userId') userId: string) {
    return this.queryService.findAllThemesByUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create theme' })
  createThemeForUser(
    @CurrentUser('userId') userId: string,
    @Body() themeData: CreateTheme,
  ) {
    return this.crudService.createThemeForUser(userId, themeData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update theme' })
  updateThemeForUser(
    @CurrentUser('userId') userId: string,
    @Param('id') themeId: string,
    @Body() updateThemeData: UpdateTheme,
  ) {
    return this.crudService.updateThemeForUser(
      userId,
      themeId,
      updateThemeData,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete theme' })
  deleteThemeForUser(
    @CurrentUser('userId') userId: string,
    @Param('id') themeId: string,
  ) {
    return this.crudService.deleteThemeForUser(userId, themeId);
  }

  @Post('fork')
  @ApiOperation({ summary: 'Fork a theme' })
  @ApiResponse({ status: 200, type: ThemeResponseDto })
  async fork(@CurrentUser('userId') userId: string, @Body() dto: ForkTheme) {
    const forkedTheme = await this.appService.forkThemeForUser(userId, dto);
    return forkedTheme;
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply theme to resume' })
  apply(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyThemeToResume,
  ) {
    return this.appService.applyToResume(userId, dto);
  }

  @Get('resume/:resumeId/config')
  @ApiOperation({ summary: 'Get resolved config for resume' })
  getResolvedConfig(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
  ) {
    return this.appService.getResolvedConfig(resumeId, userId);
  }
}
