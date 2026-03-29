/**
 * Token Evaluator Tests (TDD)
 *
 * Evaluates parsed expression ASTs against a context of resolved tokens.
 */

import { describe, expect, it } from 'bun:test';
import { type Expression, ExpressionType } from '../parsers/expression-parser';
import { TokenEvaluator } from './token-evaluator';

describe('TokenEvaluator', () => {
  const baseContext = {
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      text: {
        primary: '#1e293b',
        secondary: '#64748b',
      },
    },
    spacing: {
      unit: 4,
      scale: [0, 4, 8, 12, 16, 24, 32],
    },
    typography: {
      fontFamily: {
        heading: 'Inter',
        body: 'Inter',
      },
    },
  };

  describe('literal evaluation', () => {
    it('should return literal string value', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = { type: ExpressionType.LITERAL, value: '#ffffff' };

      const result = evaluator.evaluate(expr);

      expect(result).toBe('#ffffff');
    });

    it('should return literal number value', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = { type: ExpressionType.LITERAL, value: 42 };

      const result = evaluator.evaluate(expr);

      expect(result).toBe(42);
    });
  });

  describe('reference evaluation', () => {
    it('should resolve simple reference', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.REFERENCE,
        path: ['colors', 'primary'],
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe('#2563eb');
    });

    it('should resolve nested reference', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.REFERENCE,
        path: ['colors', 'text', 'primary'],
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe('#1e293b');
    });

    it('should resolve array index reference', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.REFERENCE,
        path: ['spacing', 'scale'],
      };

      const result = evaluator.evaluate(expr);

      expect(result).toEqual([0, 4, 8, 12, 16, 24, 32]);
    });

    it('should return undefined for missing reference', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.REFERENCE,
        path: ['colors', 'nonexistent'],
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBeUndefined();
    });
  });

  describe('binary expression evaluation', () => {
    it('should evaluate addition', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.BINARY,
        operator: '+',
        left: { type: ExpressionType.LITERAL, value: 10 },
        right: { type: ExpressionType.LITERAL, value: 5 },
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe(15);
    });

    it('should evaluate subtraction', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.BINARY,
        operator: '-',
        left: { type: ExpressionType.LITERAL, value: 10 },
        right: { type: ExpressionType.LITERAL, value: 3 },
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe(7);
    });

    it('should evaluate multiplication', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.BINARY,
        operator: '*',
        left: { type: ExpressionType.REFERENCE, path: ['spacing', 'unit'] },
        right: { type: ExpressionType.LITERAL, value: 6 },
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe(24);
    });

    it('should evaluate division', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.BINARY,
        operator: '/',
        left: { type: ExpressionType.LITERAL, value: 20 },
        right: { type: ExpressionType.LITERAL, value: 4 },
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe(5);
    });

    it('should evaluate equality (true)', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.BINARY,
        operator: '==',
        left: { type: ExpressionType.LITERAL, value: 'print' },
        right: { type: ExpressionType.LITERAL, value: 'print' },
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe(true);
    });

    it('should evaluate equality (false)', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.BINARY,
        operator: '==',
        left: { type: ExpressionType.LITERAL, value: 'screen' },
        right: { type: ExpressionType.LITERAL, value: 'print' },
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe(false);
    });

    it('should concatenate strings with +', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.BINARY,
        operator: '+',
        left: { type: ExpressionType.LITERAL, value: '2px solid ' },
        right: { type: ExpressionType.REFERENCE, path: ['colors', 'primary'] },
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe('2px solid #2563eb');
    });
  });

  describe('template expression evaluation', () => {
    it('should concatenate template parts', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.TEMPLATE,
        parts: [
          {
            type: ExpressionType.BINARY,
            operator: '*',
            left: { type: ExpressionType.REFERENCE, path: ['spacing', 'unit'] },
            right: { type: ExpressionType.LITERAL, value: 6 },
          },
          { type: ExpressionType.LITERAL, value: 'px' },
        ],
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe('24px');
    });
  });

  describe('function call evaluation', () => {
    it('should evaluate lighten function', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.FUNCTION_CALL,
        name: 'lighten',
        args: [
          { type: ExpressionType.LITERAL, value: '#000000' },
          { type: ExpressionType.LITERAL, value: 50 },
        ],
      };

      const result = evaluator.evaluate(expr);

      // #000000 lightened by 50% should be around #808080
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should evaluate darken function', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.FUNCTION_CALL,
        name: 'darken',
        args: [
          { type: ExpressionType.LITERAL, value: '#ffffff' },
          { type: ExpressionType.LITERAL, value: 50 },
        ],
      };

      const result = evaluator.evaluate(expr);

      // #ffffff darkened by 50% should be around #808080
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should evaluate alpha function', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.FUNCTION_CALL,
        name: 'alpha',
        args: [
          { type: ExpressionType.REFERENCE, path: ['colors', 'primary'] },
          { type: ExpressionType.LITERAL, value: 0.5 },
        ],
      };

      const result = evaluator.evaluate(expr);

      // Should return rgba format
      expect(result).toMatch(/^rgba?\(/);
    });

    it('should evaluate mix function', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.FUNCTION_CALL,
        name: 'mix',
        args: [
          { type: ExpressionType.LITERAL, value: '#ff0000' },
          { type: ExpressionType.LITERAL, value: '#0000ff' },
          { type: ExpressionType.LITERAL, value: 0.5 },
        ],
      };

      const result = evaluator.evaluate(expr);

      // Mix of red and blue at 50% should be purple-ish
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should evaluate when function (true condition)', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.FUNCTION_CALL,
        name: 'when',
        args: [
          { type: ExpressionType.LITERAL, value: true },
          { type: ExpressionType.LITERAL, value: 'yes' },
          { type: ExpressionType.LITERAL, value: 'no' },
        ],
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe('yes');
    });

    it('should evaluate when function (false condition)', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.FUNCTION_CALL,
        name: 'when',
        args: [
          { type: ExpressionType.LITERAL, value: false },
          { type: ExpressionType.LITERAL, value: 'yes' },
          { type: ExpressionType.LITERAL, value: 'no' },
        ],
      };

      const result = evaluator.evaluate(expr);

      expect(result).toBe('no');
    });

    it('should throw for unknown function', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const expr: Expression = {
        type: ExpressionType.FUNCTION_CALL,
        name: 'unknownFunc',
        args: [],
      };

      expect(() => evaluator.evaluate(expr)).toThrow(/unknown function/i);
    });
  });

  describe('string expression evaluation', () => {
    it('should evaluate string expression', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const result = evaluator.evaluateString('${spacing.unit * 6}px');

      expect(result).toBe('24px');
    });

    it('should return plain string as-is', () => {
      const evaluator = new TokenEvaluator(baseContext);
      const result = evaluator.evaluateString('#ffffff');

      expect(result).toBe('#ffffff');
    });
  });
});
