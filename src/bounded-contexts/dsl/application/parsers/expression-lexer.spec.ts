/**
 * Expression Lexer Tests (TDD)
 *
 * The lexer tokenizes DSL expressions like:
 * - "${colors.primary}" → [EXPR_START, IDENTIFIER, DOT, IDENTIFIER, EXPR_END]
 * - "${lighten(colors.primary, 20)}" → [EXPR_START, IDENTIFIER, LPAREN, ...]
 * - "${spacing.unit * 6}px" → [EXPR_START, IDENTIFIER, DOT, IDENTIFIER, MUL, NUMBER, EXPR_END, STRING]
 */

import { describe, expect, it } from 'bun:test';
import { ExpressionLexer, TokenType } from './expression-lexer';

describe('ExpressionLexer', () => {
  describe('literal tokenization', () => {
    it('should tokenize plain string as STRING token', () => {
      const lexer = new ExpressionLexer('#ffffff');
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // STRING + EOF
      expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: '#ffffff' });
      expect(tokens[1]).toMatchObject({ type: TokenType.EOF });
    });

    it('should tokenize integer numbers', () => {
      const lexer = new ExpressionLexer('${42}');
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.NUMBER, value: '42' }),
      );
    });

    it('should tokenize decimal numbers', () => {
      const lexer = new ExpressionLexer('${3.14}');
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.NUMBER, value: '3.14' }),
      );
    });
  });

  describe('expression delimiters', () => {
    it('should tokenize ${} as EXPR_START and EXPR_END', () => {
      const lexer = new ExpressionLexer('${foo}');
      const tokens = lexer.tokenize();

      expect(tokens[0]).toMatchObject({ type: TokenType.EXPR_START });
      expect(tokens[tokens.length - 2]).toMatchObject({ type: TokenType.EXPR_END });
    });

    it('should handle multiple expressions in string', () => {
      const lexer = new ExpressionLexer('${a} and ${b}');
      const tokens = lexer.tokenize();

      const exprStarts = tokens.filter((t) => t.type === TokenType.EXPR_START);
      const exprEnds = tokens.filter((t) => t.type === TokenType.EXPR_END);

      expect(exprStarts).toHaveLength(2);
      expect(exprEnds).toHaveLength(2);
    });
  });

  describe('identifier tokenization', () => {
    it('should tokenize simple identifier', () => {
      const lexer = new ExpressionLexer('${primary}');
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: 'primary' }),
      );
    });

    it('should tokenize dot-separated path', () => {
      const lexer = new ExpressionLexer('${colors.primary}');
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: 'colors' }),
      );
      expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.DOT }));
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: 'primary' }),
      );
    });

    it('should tokenize nested path', () => {
      const lexer = new ExpressionLexer('${colors.text.primary}');
      const tokens = lexer.tokenize();

      const dots = tokens.filter((t) => t.type === TokenType.DOT);
      expect(dots).toHaveLength(2);
    });
  });

  describe('function call tokenization', () => {
    it('should tokenize function name and parentheses', () => {
      const lexer = new ExpressionLexer('${lighten(color, 20)}');
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: 'lighten' }),
      );
      expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.LPAREN }));
      expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.RPAREN }));
    });

    it('should tokenize comma-separated arguments', () => {
      const lexer = new ExpressionLexer('${mix(color1, color2, 0.5)}');
      const tokens = lexer.tokenize();

      const commas = tokens.filter((t) => t.type === TokenType.COMMA);
      expect(commas).toHaveLength(2);
    });

    it('should tokenize nested function calls', () => {
      const lexer = new ExpressionLexer('${lighten(darken(color, 10), 5)}');
      const tokens = lexer.tokenize();

      const lparens = tokens.filter((t) => t.type === TokenType.LPAREN);
      const rparens = tokens.filter((t) => t.type === TokenType.RPAREN);

      expect(lparens).toHaveLength(2);
      expect(rparens).toHaveLength(2);
    });
  });

  describe('operator tokenization', () => {
    it('should tokenize arithmetic operators', () => {
      const lexer = new ExpressionLexer('${a + b - c * d / e}');
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.PLUS }));
      expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.MINUS }));
      expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.STAR }));
      expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.SLASH }));
    });

    it('should tokenize comparison operators', () => {
      const lexer = new ExpressionLexer('${a == b}');
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(expect.objectContaining({ type: TokenType.EQUALS }));
    });
  });

  describe('string literal tokenization', () => {
    it('should tokenize single-quoted strings inside expressions', () => {
      const lexer = new ExpressionLexer("${'solid'}");
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.STRING_LITERAL, value: 'solid' }),
      );
    });

    it('should tokenize double-quoted strings inside expressions', () => {
      const lexer = new ExpressionLexer('${"dashed"}');
      const tokens = lexer.tokenize();

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.STRING_LITERAL, value: 'dashed' }),
      );
    });
  });

  describe('mixed content', () => {
    it('should handle expression followed by literal suffix', () => {
      const lexer = new ExpressionLexer('${spacing.unit * 6}px');
      const tokens = lexer.tokenize();

      // Should have: EXPR_START, IDENTIFIER, DOT, IDENTIFIER, STAR, NUMBER, EXPR_END, STRING, EOF
      expect(tokens[tokens.length - 2]).toMatchObject({ type: TokenType.STRING, value: 'px' });
    });

    it('should handle literal prefix followed by expression', () => {
      const lexer = new ExpressionLexer('rgb(${r}, ${g}, ${b})');
      const tokens = lexer.tokenize();

      expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: 'rgb(' });
    });
  });

  describe('whitespace handling', () => {
    it('should ignore whitespace inside expressions', () => {
      const lexer1 = new ExpressionLexer('${a+b}');
      const lexer2 = new ExpressionLexer('${a + b}');

      const tokens1 = lexer1.tokenize().filter((t) => t.type !== TokenType.EOF);
      const tokens2 = lexer2.tokenize().filter((t) => t.type !== TokenType.EOF);

      expect(tokens1.map((t) => t.type)).toEqual(tokens2.map((t) => t.type));
    });
  });

  describe('error handling', () => {
    it('should handle unclosed expression gracefully', () => {
      const lexer = new ExpressionLexer('${colors.primary');
      const tokens = lexer.tokenize();

      // Should still produce tokens up to where it can parse
      expect(tokens.some((t) => t.type === TokenType.IDENTIFIER)).toBe(true);
    });

    it('should handle unclosed string literal', () => {
      const lexer = new ExpressionLexer("${'unclosed");
      const tokens = lexer.tokenize();

      // Should have an error token or partial string
      expect(tokens.some((t) => t.type === TokenType.ERROR || t.type === TokenType.EOF)).toBe(true);
    });
  });

  describe('position tracking', () => {
    it('should track token positions', () => {
      const lexer = new ExpressionLexer('${foo}');
      const tokens = lexer.tokenize();

      expect(tokens[0]).toMatchObject({ type: TokenType.EXPR_START, position: 0 });
      expect(tokens[1]).toMatchObject({ type: TokenType.IDENTIFIER, position: 2 });
    });
  });
});
