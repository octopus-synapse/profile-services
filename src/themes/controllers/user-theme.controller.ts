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
import {
  CreateThemeDto,
  UpdateThemeDto,
  ForkThemeDto,
  ApplyThemeToResumeDto,
} from '../dto';

@ApiTags('themes')
@Controller('themes')
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
  getMyThemes(@CurrentUser('userId') userId: string) {
    return this.queryService.getMyThemes(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create theme' })
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateThemeDto) {
    return this.crudService.create(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update theme' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateThemeDto,
  ) {
    return this.crudService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete theme' })
  delete(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.crudService.delete(userId, id);
  }

  @Post('fork')
  @ApiOperation({ summary: 'Fork a theme' })
  fork(@CurrentUser('userId') userId: string, @Body() dto: ForkThemeDto) {
    return this.appService.fork(userId, dto);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply theme to resume' })
  apply(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyThemeToResumeDto,
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
