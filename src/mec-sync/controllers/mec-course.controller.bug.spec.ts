/**
 * MEC Course Controller Bug Detection Tests
 *
 * Uncle Bob: "parseInt pode retornar NaN e ninguém verifica!"
 *
 * BUG-035: parseInt Without NaN Validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MecCourseController } from './mec-course.controller';
import { CourseQueryService } from '../services/course-query.service';

describe('MecCourseController - BUG DETECTION', () => {
  let controller: MecCourseController;
  let mockCourseQuery: any;

  beforeEach(async () => {
    mockCourseQuery = {
      search: jest.fn().mockResolvedValue([]),
      getByCode: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecCourseController],
      providers: [{ provide: CourseQueryService, useValue: mockCourseQuery }],
    }).compile();

    controller = module.get<MecCourseController>(MecCourseController);
  });

  describe('BUG-035: parseInt NaN Not Validated', () => {
    /**
     * parseInt('abc', 10) returns NaN
     * NaN is passed to service without validation
     * Could cause unexpected behavior or errors
     */
    it('should validate limit is a valid number', async () => {
      // Pass non-numeric limit
      await controller.searchCourses('test query', 'not-a-number');

      // BUG: NaN was passed to service!
      const lastCall = mockCourseQuery.search.mock.calls[0];
      const passedLimit = lastCall[1];

      // Should NOT be NaN
      expect(Number.isNaN(passedLimit)).toBe(false);
    });

    it('should reject negative limits', async () => {
      await controller.searchCourses('test query', '-10');

      const lastCall = mockCourseQuery.search.mock.calls[0];
      const passedLimit = lastCall[1];

      // BUG: Negative number was parsed and passed!
      // Should validate limit > 0
      expect(passedLimit).toBeGreaterThan(0);
    });

    it('should reject extremely large limits', async () => {
      await controller.searchCourses('test query', '999999999');

      const lastCall = mockCourseQuery.search.mock.calls[0];
      const passedLimit = lastCall[1];

      // BUG: Huge limit was passed!
      // Should cap at reasonable maximum (e.g., 100)
      expect(passedLimit).toBeLessThanOrEqual(100);
    });

    it('should handle float strings', async () => {
      await controller.searchCourses('test query', '10.5');

      const lastCall = mockCourseQuery.search.mock.calls[0];
      const passedLimit = lastCall[1];

      // parseInt truncates to 10, which is OK
      // But should this be explicit behavior?
      expect(Number.isInteger(passedLimit)).toBe(true);
    });

    it('should handle empty string limit', async () => {
      await controller.searchCourses('test query', '');

      const lastCall = mockCourseQuery.search.mock.calls[0];
      const passedLimit = lastCall[1];

      // parseInt('', 10) returns NaN
      // BUG: NaN passed to service!
      expect(Number.isNaN(passedLimit)).toBe(false);
    });
  });
});
