import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseQueryService } from '../services/course-query.service';
import { MecCourseController } from './mec-course.controller';

const createMockService = () => ({
  searchCoursesByName: mock(() => Promise.resolve([{ codigoCurso: 123 }])),
  findCourseByCode: mock(() =>
    Promise.resolve({ codigoCurso: 123, nome: 'Engenharia de Software' }),
  ),
});

describe('MecCourseController - Contract', () => {
  let controller: MecCourseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecCourseController],
      providers: [{ provide: CourseQueryService, useValue: createMockService() }],
    }).compile();

    controller = module.get<MecCourseController>(MecCourseController);
  });

  it('searchCoursesByName returns data with courses', async () => {
    const result = await controller.searchCoursesByName('engenharia', '10');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('courses');
  });

  it('getCourseByCode returns data with course', async () => {
    const result = await controller.getCourseByCode(123);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('course');
  });
});
