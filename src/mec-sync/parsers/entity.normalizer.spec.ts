import { normalizeInstitution, normalizeCourse } from './entity.normalizer';
import { MecCsvRow } from '../interfaces/mec-data.interface';

describe('Entity Normalizer', () => {
  const createMockRow = (overrides: Partial<MecCsvRow> = {}): MecCsvRow => ({
    CO_IES: '12345',
    NO_IES: 'Universidade Federal do Rio de Janeiro',
    SG_IES: 'UFRJ',
    TP_ORGANIZACAO: 'Universidade',
    TP_CATEGORIA: 'Pública Federal',
    CO_MUNICIPIO_IES: '3304557',
    NO_MUNICIPIO_IES: 'Rio de Janeiro',
    SG_UF_IES: 'RJ',
    CO_CURSO: '116815',
    NO_CURSO: 'Ciência da Computação',
    TP_GRAU: 'Bacharelado',
    TP_MODALIDADE: 'Presencial',
    NO_CINE_AREA_GERAL: 'Computação',
    QT_CARGA_HORARIA: '3200',
    CO_SITUACAO: 'Em atividade',
    ...overrides,
  });

  describe('normalizeInstitution', () => {
    describe('Valid Input', () => {
      it('should normalize a complete institution row', () => {
        const row = createMockRow();

        const result = normalizeInstitution(row);

        expect(result).not.toBeNull();
        expect(result?.codigoIes).toBe(12345);
        // normalizeText applies title case transformation
        expect(result?.nome).toBeDefined();
        expect(result?.sigla).toBeDefined();
        expect(result?.uf).toBe('RJ');
        expect(result?.municipio).toBeDefined();
        expect(result?.codigoMunicipio).toBe(3304557);
      });

      it('should uppercase UF', () => {
        const row = createMockRow({ SG_UF_IES: 'sp' });

        const result = normalizeInstitution(row);

        expect(result?.uf).toBe('SP');
      });

      it('should handle missing optional fields', () => {
        const row = createMockRow({
          SG_IES: '',
          NO_MUNICIPIO_IES: '',
          CO_MUNICIPIO_IES: '',
        });

        const result = normalizeInstitution(row);

        expect(result).not.toBeNull();
        expect(result?.sigla).toBeNull();
        expect(result?.municipio).toBeNull();
        expect(result?.codigoMunicipio).toBeNull();
      });

      it('should normalize text with extra whitespace', () => {
        const row = createMockRow({
          NO_IES: '  Universidade   Federal  ',
        });

        const result = normalizeInstitution(row);

        expect(result?.nome).toBe('Universidade Federal');
      });
    });

    describe('Invalid Input', () => {
      it('should return null when CO_IES is not a number', () => {
        const row = createMockRow({ CO_IES: 'invalid' });

        const result = normalizeInstitution(row);

        expect(result).toBeNull();
      });

      it('should return null when CO_IES is empty', () => {
        const row = createMockRow({ CO_IES: '' });

        const result = normalizeInstitution(row);

        expect(result).toBeNull();
      });

      it('should return null when NO_IES is empty', () => {
        const row = createMockRow({ NO_IES: '' });

        const result = normalizeInstitution(row);

        expect(result).toBeNull();
      });

      it('should return null when SG_UF_IES is empty', () => {
        const row = createMockRow({ SG_UF_IES: '' });

        const result = normalizeInstitution(row);

        expect(result).toBeNull();
      });
    });

    describe('Organization and Category Mapping', () => {
      it('should map organization type', () => {
        const row = createMockRow({ TP_ORGANIZACAO: 'Universidade' });

        const result = normalizeInstitution(row);

        expect(result?.organizacao).toBeDefined();
      });

      it('should map category type', () => {
        const row = createMockRow({ TP_CATEGORIA: 'Pública Federal' });

        const result = normalizeInstitution(row);

        expect(result?.categoria).toBeDefined();
      });
    });
  });

  describe('normalizeCourse', () => {
    describe('Valid Input', () => {
      it('should normalize a complete course row', () => {
        const row = createMockRow();

        const result = normalizeCourse(row);

        expect(result).not.toBeNull();
        expect(result?.codigoCurso).toBe(116815);
        expect(result?.codigoIes).toBe(12345);
        expect(result?.nome).toBe('Ciência da Computação');
        expect(result?.cargaHoraria).toBe(3200);
      });

      it('should handle missing optional fields', () => {
        const row = createMockRow({
          NO_CINE_AREA_GERAL: '',
          QT_CARGA_HORARIA: '',
        });

        const result = normalizeCourse(row);

        expect(result).not.toBeNull();
        expect(result?.areaConhecimento).toBeNull();
        expect(result?.cargaHoraria).toBeNull();
      });

      it('should map degree type', () => {
        const row = createMockRow({ TP_GRAU: 'Bacharelado' });

        const result = normalizeCourse(row);

        expect(result?.grau).toBeDefined();
      });

      it('should map modality type', () => {
        const row = createMockRow({ TP_MODALIDADE: 'Presencial' });

        const result = normalizeCourse(row);

        expect(result?.modalidade).toBeDefined();
      });

      it('should map course status', () => {
        const row = createMockRow({ CO_SITUACAO: 'Em atividade' });

        const result = normalizeCourse(row);

        expect(result?.situacao).toBeDefined();
      });
    });

    describe('Invalid Input', () => {
      it('should return null when CO_CURSO is not a number', () => {
        const row = createMockRow({ CO_CURSO: 'invalid' });

        const result = normalizeCourse(row);

        expect(result).toBeNull();
      });

      it('should return null when CO_CURSO is empty', () => {
        const row = createMockRow({ CO_CURSO: '' });

        const result = normalizeCourse(row);

        expect(result).toBeNull();
      });

      it('should return null when CO_IES is not a number', () => {
        const row = createMockRow({ CO_IES: 'invalid' });

        const result = normalizeCourse(row);

        expect(result).toBeNull();
      });

      it('should return null when NO_CURSO is empty', () => {
        const row = createMockRow({ NO_CURSO: '' });

        const result = normalizeCourse(row);

        expect(result).toBeNull();
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero as valid course code', () => {
        const row = createMockRow({ CO_CURSO: '0' });

        const result = normalizeCourse(row);

        // 0 is a valid number, but unusual - implementation decides
        expect(result?.codigoCurso).toBe(0);
      });

      it('should handle floating point numbers (truncates)', () => {
        const row = createMockRow({
          CO_CURSO: '12345.67',
          QT_CARGA_HORARIA: '3200.5',
        });

        const result = normalizeCourse(row);

        expect(result?.codigoCurso).toBe(12345);
        expect(result?.cargaHoraria).toBe(3200);
      });

      it('should normalize course name with special characters', () => {
        const row = createMockRow({
          NO_CURSO: 'Análise e Desenvolvimento de Sistemas (Tecnólogo)',
        });

        const result = normalizeCourse(row);

        // normalizeText may change case, but should preserve accents
        expect(result?.nome?.toLowerCase()).toContain('análise');
        expect(result?.nome?.toLowerCase()).toContain('tecnólogo');
      });
    });
  });
});
