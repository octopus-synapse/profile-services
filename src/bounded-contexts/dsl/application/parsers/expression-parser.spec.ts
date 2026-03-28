/**
 * Expression Parser Tests (TDD)
 *
 * The parser transforms tokens into an AST for expressions like:
 * - "${colors.primary}" → ReferenceExpr { path: ['colors', 'primary'] }
 * - "${lighten(color, 20)}" → FunctionExpr { name: 'lighten', args: [...] }
 * - "${a + b}" → BinaryExpr { op: '+', left: ..., right: ... }
 */

import { describe, expect, it } from 'bun:test';
import { type Expression, ExpressionParser, ExpressionType } from './expression-parser';

describe('ExpressionParser', () => {
  describe('literal expressions', () => {
    it('should parse plain string as literal', () => {
      const parser = new ExpressionParser('#ffffff');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.LITERAL,
        value: '#ffffff',
      });
    });

    it('should parse number inside expression', () => {
      const parser = new ExpressionParser('${42}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.LITERAL,
        value: 42,
      });
    });

    it('should parse decimal number', () => {
      const parser = new ExpressionParser('${3.14}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.LITERAL,
        value: 3.14,
      });
    });

    it('should parse string literal inside expression', () => {
      const parser = new ExpressionParser("${'solid'}");
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.LITERAL,
        value: 'solid',
      });
    });
  });

  describe('reference expressions', () => {
    it('should parse simple reference', () => {
      const parser = new ExpressionParser('${primary}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.REFERENCE,
        path: ['primary'],
      });
    });

    it('should parse dot-separated path', () => {
      const parser = new ExpressionParser('${colors.primary}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.REFERENCE,
        path: ['colors', 'primary'],
      });
    });

    it('should parse deeply nested path', () => {
      const parser = new ExpressionParser('${colors.text.primary}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.REFERENCE,
        path: ['colors', 'text', 'primary'],
      });
    });
  });

  describe('function call expressions', () => {
    it('should parse function with single argument', () => {
      const parser = new ExpressionParser('${lighten(color)}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.FUNCTION_CALL,
        name: 'lighten',
        args: [{ type: ExpressionType.REFERENCE, path: ['color'] }],
      });
    });

    it('should parse function with multiple arguments', () => {
      const parser = new ExpressionParser('${mix(color1, color2, 0.5)}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.FUNCTION_CALL,
        name: 'mix',
      });
      expect((result as { args: Expression[] }).args).toHaveLength(3);
    });

    it('should parse function with reference argument', () => {
      const parser = new ExpressionParser('${lighten(colors.primary, 20)}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.FUNCTION_CALL,
        name: 'lighten',
        args: [
          { type: ExpressionType.REFERENCE, path: ['colors', 'primary'] },
          { type: ExpressionType.LITERAL, value: 20 },
        ],
      });
    });

    it('should parse nested function calls', () => {
      const parser = new ExpressionParser('${lighten(darken(color, 10), 5)}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.FUNCTION_CALL,
        name: 'lighten',
      });

      const args = (result as { args: Expression[] }).args;
      expect(args[0]).toMatchObject({
        type: ExpressionType.FUNCTION_CALL,
        name: 'darken',
      });
    });
  });

  describe('binary expressions', () => {
    it('should parse addition', () => {
      const parser = new ExpressionParser('${a + b}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.BINARY,
        operator: '+',
        left: { type: ExpressionType.REFERENCE, path: ['a'] },
        right: { type: ExpressionType.REFERENCE, path: ['b'] },
      });
    });

    it('should parse subtraction', () => {
      const parser = new ExpressionParser('${a - b}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.BINARY,
        operator: '-',
      });
    });

    it('should parse multiplication', () => {
      const parser = new ExpressionParser('${spacing.unit * 6}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.BINARY,
        operator: '*',
        left: { type: ExpressionType.REFERENCE, path: ['spacing', 'unit'] },
        right: { type: ExpressionType.LITERAL, value: 6 },
      });
    });

    it('should parse division', () => {
      const parser = new ExpressionParser('${a / b}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.BINARY,
        operator: '/',
      });
    });

    it('should respect operator precedence (mul before add)', () => {
      const parser = new ExpressionParser('${a + b * c}');
      const result = parser.parse();

      // Should be: a + (b * c)
      expect(result).toMatchObject({
        type: ExpressionType.BINARY,
        operator: '+',
        left: { type: ExpressionType.REFERENCE, path: ['a'] },
        right: {
          type: ExpressionType.BINARY,
          operator: '*',
        },
      });
    });

    it('should handle left-to-right associativity', () => {
      const parser = new ExpressionParser('${a - b - c}');
      const result = parser.parse();

      // Should be: (a - b) - c
      expect(result).toMatchObject({
        type: ExpressionType.BINARY,
        operator: '-',
        left: {
          type: ExpressionType.BINARY,
          operator: '-',
          left: { path: ['a'] },
          right: { path: ['b'] },
        },
        right: { path: ['c'] },
      });
    });
  });

  describe('comparison expressions', () => {
    it('should parse equality comparison', () => {
      const parser = new ExpressionParser('${context.media == "print"}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.BINARY,
        operator: '==',
        left: { type: ExpressionType.REFERENCE, path: ['context', 'media'] },
        right: { type: ExpressionType.LITERAL, value: 'print' },
      });
    });
  });

  describe('template expressions (mixed content)', () => {
    it('should parse expression with suffix', () => {
      const parser = new ExpressionParser('${spacing.unit * 6}px');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.TEMPLATE,
        parts: [
          {
            type: ExpressionType.BINARY,
            operator: '*',
          },
          { type: ExpressionType.LITERAL, value: 'px' },
        ],
      });
    });

    it('should parse expression with prefix', () => {
      const parser = new ExpressionParser('calc(${value})');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.TEMPLATE,
        parts: [
          { type: ExpressionType.LITERAL, value: 'calc(' },
          { type: ExpressionType.REFERENCE, path: ['value'] },
          { type: ExpressionType.LITERAL, value: ')' },
        ],
      });
    });

    it('should parse multiple expressions', () => {
      const parser = new ExpressionParser('${r}, ${g}, ${b}');
      const result = parser.parse();

      expect(result).toMatchObject({
        type: ExpressionType.TEMPLATE,
      });
      expect((result as { parts: Expression[] }).parts).toHaveLength(5);
    });
  });

  describe('error handling', () => {
    it('should return error for malformed expression', () => {
      const parser = new ExpressionParser('${+}');
      const result = parser.parse();

      expect(result.type).toBe(ExpressionType.ERROR);
    });

    it('should return error for unclosed parenthesis', () => {
      const parser = new ExpressionParser('${func(a, b}');
      const result = parser.parse();

      expect(result.type).toBe(ExpressionType.ERROR);
    });
  });
});
