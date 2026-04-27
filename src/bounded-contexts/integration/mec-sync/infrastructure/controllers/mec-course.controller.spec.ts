import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GetCourseByCodeUseCase } from '../../application/use-cases/get-course-by-code/get-course-by-code.use-case';
import { SearchCoursesUseCase } from '../../application/use-cases/search-courses/search-courses.use-case';
import { MecCourseController } from './mec-course.controller';

describe('MecCourseController - Contract', () => {
  let controller: MecCourseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecCourseController],
      providers: [
        {
          provide: SearchCoursesUseCase,
          useValue: { execute: mock(() => Promise.resolve([{ codigoCurso: 123 }])) },
        },
        {
          provide: GetCourseByCodeUseCase,
          useValue: {
            execute: mock(() =>
              Promise.resolve({ codigoCurso: 123, nome: 'Engenharia de Software' }),
            ),
          },
        },
      ],
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
