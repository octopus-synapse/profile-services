/**
 * User Theme Routes
 * Requires authentication
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
} from '@octopus-synapse/profile-contracts';

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
