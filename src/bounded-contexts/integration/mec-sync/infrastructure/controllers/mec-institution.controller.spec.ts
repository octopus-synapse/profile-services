import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { MecSyncUseCases } from '../../application/ports/mec-sync.port';
import { MecInstitutionController } from './mec-institution.controller';

describe('MecInstitutionController - Contract', () => {
  let controller: MecInstitutionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecInstitutionController],
      providers: [
        {
          provide: MecSyncUseCases,
          useValue: {
            listInstitutions: {
              execute: mock(() => Promise.resolve([{ codigoIes: 1, nome: 'UFSP' }])),
            },
            searchInstitutions: {
              execute: mock(() => Promise.resolve([{ codigoIes: 3, nome: 'USP' }])),
            },
            getInstitutionByCode: {
              execute: mock(() => Promise.resolve({ codigoIes: 1, courses: [] })),
            },
            listCoursesByInstitution: {
              execute: mock(() => Promise.resolve([{ codigoCurso: 10, nome: 'Direito' }])),
            },
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
