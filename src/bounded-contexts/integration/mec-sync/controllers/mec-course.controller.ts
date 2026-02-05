/**
 * MEC Course Controller
 * Public API endpoints for MEC course queries
 *
 * BUG-035 FIX: Added parseInt validation with NaN handling
 */

import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { CourseQueryService } from '../services/course-query.service';
import { APP_CONFIG } from '@/shared-kernel';

@SdkExport({
  tag: 'mec-courses',
  description: 'Mec Courses API',
  requiresAuth: false,
})
@ApiTags('mec-courses')
@Controller('v1/mec/courses')
export class MecCourseController {
  constructor(private readonly courseQuery: CourseQueryService) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search courses' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchCoursesByName(
    @Query('q') searchQuery: string,
    @Query('limit') limit?: string,
  ) {
    // BUG-035 FIX: Validate parseInt result
    let parsedLimit: number = APP_CONFIG.DEFAULT_PAGE_SIZE;
    if (limit) {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new BadRequestException(
          'Invalid limit parameter. Must be a positive number.',
        );
      }
    }
    return this.courseQuery.searchCoursesByName(searchQuery, parsedLimit);
  }

  @Get(':codigoCurso')
  @Public()
  @ApiOperation({ summary: 'Get course by MEC code' })
  @ApiParam({ name: 'codigoCurso', type: Number })
  async getCourseByCode(
    @Param('codigoCurso', ParseIntPipe) codigoCurso: number,
  ) {
    return this.courseQuery.findCourseByCode(codigoCurso);
  }
}
