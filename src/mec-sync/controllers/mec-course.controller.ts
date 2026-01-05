/**
 * MEC Course Controller
 * Public API endpoints for MEC course queries
 */

import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { CourseQueryService } from '../services/course-query.service';
import { APP_CONSTANTS } from '../../common/constants/config';

@ApiTags('mec-courses')
@Controller('v1/mec/courses')
export class MecCourseController {
  constructor(private readonly courseQuery: CourseQueryService) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search courses' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchCourses(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit
      ? parseInt(limit, 10)
      : APP_CONSTANTS.DEFAULT_PAGE_SIZE;
    return this.courseQuery.search(query, parsedLimit);
  }

  @Get(':codigoCurso')
  @Public()
  @ApiOperation({ summary: 'Get course by MEC code' })
  @ApiParam({ name: 'codigoCurso', type: Number })
  async getCourseByCode(
    @Param('codigoCurso', ParseIntPipe) codigoCurso: number,
  ) {
    return this.courseQuery.getByCode(codigoCurso);
  }
}
