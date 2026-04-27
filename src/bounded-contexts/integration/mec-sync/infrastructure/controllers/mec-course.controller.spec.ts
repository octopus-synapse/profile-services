import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { MecSyncUseCases } from '../../application/ports/mec-sync.port';
import { MecCourseController } from './mec-course.controller';

describe('MecCourseController - Contract', () => {
  let controller: MecCourseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecCourseController],
      providers: [
        {
          provide: MecSyncUseCases,
          useValue: {
            searchCourses: { execute: mock(() => Promise.resolve([{ codigoCurso: 123 }])) },
            getCourseByCode: {
              execute: mock(() =>
                Promise.resolve({ codigoCurso: 123, nome: 'Engenharia de Software' }),
              ),
            },
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
