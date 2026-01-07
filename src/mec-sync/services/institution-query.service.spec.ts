/**
 * InstitutionQueryService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Retorna institutions corretamente
 * - Cache hit/miss behavior
 * - Search functionality
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionQueryService } from './institution-query.service';
import { InstitutionRepository } from '../repositories';
import { CacheService } from '../../common/cache/cache.service';

describe('InstitutionQueryService', () => {
  let service: InstitutionQueryService;

  const mockInstitutions = [
    {
      id: '1',
      codigoIes: 1001,
      nome: 'Universidade de São Paulo',
      sigla: 'USP',
      uf: 'SP',
      municipio: 'São Paulo',
      categoria: 'Pública Federal',
      organizacao: 'Universidade',
    },
    {
      id: '2',
      codigoIes: 1002,
      nome: 'Universidade Federal do Rio de Janeiro',
      sigla: 'UFRJ',
      uf: 'RJ',
      municipio: 'Rio de Janeiro',
      categoria: 'Pública Federal',
      organizacao: 'Universidade',
    },
  ];

  const cacheStore = new Map<string, unknown>();

  const stubRepository = {
    findAll: mock().mockResolvedValue(mockInstitutions),
    findByUf: mock().mockImplementation((uf: string) => {
      return Promise.resolve(mockInstitutions.filter((i) => i.uf === uf));
    }),
    findByCode: mock().mockImplementation((code: number) => {
      return Promise.resolve(
        mockInstitutions.find((i) => i.codigoIes === code) ?? null,
      );
    }),
    search: mock().mockResolvedValue([mockInstitutions[0]]),
    getDistinctUfs: mock().mockResolvedValue(['SP', 'RJ', 'MG']),
  };

  const stubCache = {
    get: mock((key: string) => Promise.resolve(cacheStore.get(key) ?? null)),
    set: mock((key: string, value: unknown) => {
      cacheStore.set(key, value);
      return Promise.resolve();
    }),
  };

  beforeEach(async () => {
    cacheStore.clear();const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionQueryService,
        { provide: InstitutionRepository, useValue: stubRepository },
        { provide: CacheService, useValue: stubCache },
      ],
    }).compile();

    service = module.get<InstitutionQueryService>(InstitutionQueryService);
  });

  describe('listAll', () => {
    it('should return all institutions', async () => {
      const result = await service.listAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        codigoIes: 1001,
        nome: 'Universidade de São Paulo',
        sigla: 'USP',
      });
    });

    it('should cache results', async () => {
      await service.listAll();
      await service.listAll();

      expect(stubRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('listByState', () => {
    it('should return institutions filtered by state', async () => {
      const result = await service.listByState('SP');

      expect(result).toHaveLength(1);
      expect(result[0].uf).toBe('SP');
    });

    it('should normalize state to uppercase', async () => {
      await service.listByState('sp');

      expect(stubRepository.findByUf).toHaveBeenCalledWith('SP');
    });

    it('should cache results per state', async () => {
      await service.listByState('SP');
      await service.listByState('SP');

      expect(stubRepository.findByUf).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByCode', () => {
    it('should return institution with courses when found', async () => {
      stubRepository.findByCode.mockResolvedValueOnce({
        ...mockInstitutions[0],
        courses: [{ id: 'c1', nome: 'Engenharia' }],
      });

      const result = await service.getByCode(1001);

      expect(result).toMatchObject({
        codigoIes: 1001,
        nome: 'Universidade de São Paulo',
      });
    });

    it('should return null when institution not found', async () => {
      stubRepository.findByCode.mockResolvedValueOnce(null);

      const result = await service.getByCode(9999);

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should return matching institutions', async () => {
      const result = await service.search('São Paulo');

      expect(result).toHaveLength(1);
      expect(result[0].nome).toContain('São Paulo');
    });

    it('should return empty array for short queries', async () => {
      const result = await service.search('U');

      expect(result).toEqual([]);
    });

    it('should normalize query to lowercase', async () => {
      await service.search('USP');

      expect(stubRepository.search).toHaveBeenCalledWith(
        'usp',
        expect.any(Number),
      );
    });
  });

  describe('getStateList', () => {
    it('should return list of distinct UFs', async () => {
      const result = await service.getStateList();

      expect(result).toEqual(['SP', 'RJ', 'MG']);
    });
  });
});
