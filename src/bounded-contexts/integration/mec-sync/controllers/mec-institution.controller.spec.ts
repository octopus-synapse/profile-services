import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseQueryService } from '../services/course-query.service';
import { InstitutionQueryService } from '../services/institution-query.service';
import { MecInstitutionController } from './mec-institution.controller';

const createInstitutionQueryService = () => ({
  listInstitutionsByState: mock(() => Promise.resolve([{ codigoIes: 1, nome: 'UFSP' }])),
  listAllActiveInstitutions: mock(() => Promise.resolve([{ codigoIes: 2, nome: 'UFRJ' }])),
  searchInstitutionsByName: mock(() => Promise.resolve([{ codigoIes: 3, nome: 'USP' }])),
  findInstitutionByCodeWithCourses: mock(() => Promise.resolve({ codigoIes: 1, courses: [] })),
});

const createCourseQueryService = () => ({
  listCoursesByInstitutionCode: mock(() => Promise.resolve([{ codigoCurso: 10, nome: 'Direito' }])),
});

describe('MecInstitutionController - Contract', () => {
  let controller: MecInstitutionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecInstitutionController],
      providers: [
        {
          provide: InstitutionQueryService,
          useValue: createInstitutionQueryService(),
        },
        { provide: CourseQueryService, useValue: createCourseQueryService() },
      ],
    }).compile();

    controller = module.get<MecInstitutionController>(MecInstitutionController);
  });

  it('listInstitutions returns data with institutions', async () => {
    const result = await controller.listInstitutions('SP');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('institutions');
  });

  it('searchInstitutionsByName returns data with institutions', async () => {
    const result = await controller.searchInstitutionsByName('federal', '10');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('institutions');
  });

  it('getInstitutionByCodeWithCourses returns data with institution', async () => {
    const result = await controller.getInstitutionByCodeWithCourses(1);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('institution');
  });

  it('listCoursesByInstitutionCode returns data with courses', async () => {
    const result = await controller.listCoursesByInstitutionCode(1);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('courses');
  });
});
