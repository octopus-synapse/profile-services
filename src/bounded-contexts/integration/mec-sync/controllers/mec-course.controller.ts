/**
 * MEC Course Controller
 * Public API endpoints for MEC course queries
 *
 * BUG-035 FIX: Added parseInt validation with NaN handling
 */

import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { APP_CONFIG } from '@/shared-kernel';
import { MecCourseDataDto, MecCourseListDataDto } from '../dto/controller-response.dto';
import { CourseQueryService } from '../services/course-query.service';

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
  @ApiDataResponse(MecCourseListDataDto, {
    description: 'Courses search results returned',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchCoursesByName(
    @Query('q') searchQuery: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<MecCourseListDataDto>> {
    // BUG-035 FIX: Validate parseInt result
    let parsedLimit: number = APP_CONFIG.DEFAULT_PAGE_SIZE;
    if (limit) {
      parsedLimit = parseInt(limit, 10);
      if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new BadRequestException('Invalid limit parameter. Must be a positive number.');
      }
    }
    const courses = await this.courseQuery.searchCoursesByName(searchQuery, parsedLimit);

    return {
      success: true,
      data: {
        courses,
      },
    };
  }

  @Get(':codigoCurso')
  @Public()
  @ApiOperation({ summary: 'Get course by MEC code' })
  @ApiDataResponse(MecCourseDataDto, {
    description: 'Course returned by MEC code',
  })
  @ApiParam({ name: 'codigoCurso', type: Number })
  async getCourseByCode(
    @Param('codigoCurso', ParseIntPipe) codigoCurso: number,
  ): Promise<DataResponse<MecCourseDataDto>> {
    const course = await this.courseQuery.findCourseByCode(codigoCurso);

    return {
      success: true,
      data: {
        course,
      },
    };
  }
}
