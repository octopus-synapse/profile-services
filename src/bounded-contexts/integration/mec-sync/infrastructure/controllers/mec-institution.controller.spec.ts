import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GetInstitutionByCodeUseCase } from '../../application/use-cases/get-institution-by-code/get-institution-by-code.use-case';
import { ListCoursesByInstitutionUseCase } from '../../application/use-cases/list-courses-by-institution/list-courses-by-institution.use-case';
import { ListInstitutionsUseCase } from '../../application/use-cases/list-institutions/list-institutions.use-case';
import { SearchInstitutionsUseCase } from '../../application/use-cases/search-institutions/search-institutions.use-case';
import { MecInstitutionController } from './mec-institution.controller';

describe('MecInstitutionController - Contract', () => {
  let controller: MecInstitutionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecInstitutionController],
      providers: [
        {
          provide: ListInstitutionsUseCase,
          useValue: { execute: mock(() => Promise.resolve([{ codigoIes: 1, nome: 'UFSP' }])) },
        },
        {
          provide: SearchInstitutionsUseCase,
          useValue: { execute: mock(() => Promise.resolve([{ codigoIes: 3, nome: 'USP' }])) },
        },
        {
          provide: GetInstitutionByCodeUseCase,
          useValue: { execute: mock(() => Promise.resolve({ codigoIes: 1, courses: [] })) },
        },
        {
          provide: ListCoursesByInstitutionUseCase,
          useValue: {
            execute: mock(() => Promise.resolve([{ codigoCurso: 10, nome: 'Direito' }])),
          },
        },
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
