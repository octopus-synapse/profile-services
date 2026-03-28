/**
 * Expression Parser
 *
 * Parses tokenized DSL expressions into an AST.
 * Uses recursive descent parsing with operator precedence.
 */

import { ExpressionLexer, type Token, TokenType } from './expression-lexer';

export enum ExpressionType {
  LITERAL = 'LITERAL',
  REFERENCE = 'REFERENCE',
  FUNCTION_CALL = 'FUNCTION_CALL',
  BINARY = 'BINARY',
  TEMPLATE = 'TEMPLATE',
  ERROR = 'ERROR',
}

export type Expression =
  | LiteralExpr
  | ReferenceExpr
  | FunctionCallExpr
  | BinaryExpr
  | TemplateExpr
  | ErrorExpr;

export interface LiteralExpr {
  type: ExpressionType.LITERAL;
  value: string | number | boolean;
}

export interface ReferenceExpr {
  type: ExpressionType.REFERENCE;
  path: string[];
}

export interface FunctionCallExpr {
  type: ExpressionType.FUNCTION_CALL;
  name: string;
  args: Expression[];
}

export interface BinaryExpr {
  type: ExpressionType.BINARY;
  operator: string;
  left: Expression;
  right: Expression;
}

export interface TemplateExpr {
  type: ExpressionType.TEMPLATE;
  parts: Expression[];
}

export interface ErrorExpr {
  type: ExpressionType.ERROR;
  message: string;
  position: number;
}

export class ExpressionParser {
  private tokens: Token[] = [];
  private current = 0;

  constructor(private readonly input: string) {}

  parse(): Expression {
    const lexer = new ExpressionLexer(this.input);
    this.tokens = lexer.tokenize();
    this.current = 0;

    try {
      return this.parseTemplate();
    } catch (error) {
      return {
        type: ExpressionType.ERROR,
        message: error instanceof Error ? error.message : 'Parse error',
        position: this.current,
      };
    }
  }

  private parseTemplate(): Expression {
    const parts: Expression[] = [];

    while (!this.isAtEnd()) {
      if (this.check(TokenType.STRING)) {
        parts.push({
          type: ExpressionType.LITERAL,
          value: this.advance().value,
        });
      } else if (this.check(TokenType.EXPR_START)) {
        this.advance(); // consume ${
        const expr = this.parseExpression();
        parts.push(expr);

        if (!this.check(TokenType.EXPR_END)) {
          throw new Error('Expected } after expression');
        }
        this.advance(); // consume }
      } else {
        break;
      }
    }

    // Simplify single-part templates
    if (parts.length === 0) {
      return { type: ExpressionType.LITERAL, value: '' };
    }

    if (parts.length === 1) {
      return parts[0];
    }

    return { type: ExpressionType.TEMPLATE, parts };
  }

  private parseExpression(): Expression {
    return this.parseEquality();
  }

  private parseEquality(): Expression {
    let left = this.parseAdditive();

    while (this.check(TokenType.EQUALS)) {
      const operator = this.advance().value;
      const right = this.parseAdditive();
      left = { type: ExpressionType.BINARY, operator, left, right };
    }

    return left;
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const operator = this.advance().value;
      const right = this.parseMultiplicative();
      left = { type: ExpressionType.BINARY, operator, left, right };
    }

    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary();

    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH)) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left = { type: ExpressionType.BINARY, operator, left, right };
    }

    return left;
  }

  private parseUnary(): Expression {
    if (this.check(TokenType.MINUS)) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      return {
        type: ExpressionType.BINARY,
        operator,
        left: { type: ExpressionType.LITERAL, value: 0 },
        right,
      };
    }

    return this.parseCall();
  }

  private parseCall(): Expression {
    let expr = this.parsePrimary();

    // Check if it's a function call
    if (expr.type === ExpressionType.REFERENCE && this.check(TokenType.LPAREN)) {
      const name = expr.path[0];
      this.advance(); // consume (

      const args: Expression[] = [];

      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }

      if (!this.check(TokenType.RPAREN)) {
        throw new Error('Expected ) after function arguments');
      }
      this.advance(); // consume )

      expr = { type: ExpressionType.FUNCTION_CALL, name, args };
    }

    return expr;
  }

  private parsePrimary(): Expression {
    // Number literal
    if (this.check(TokenType.NUMBER)) {
      const value = parseFloat(this.advance().value);
      return { type: ExpressionType.LITERAL, value };
    }

    // String literal
    if (this.check(TokenType.STRING_LITERAL)) {
      const value = this.advance().value;
      return { type: ExpressionType.LITERAL, value };
    }

    // Identifier or reference path
    if (this.check(TokenType.IDENTIFIER)) {
      const path: string[] = [];
      path.push(this.advance().value);

      while (this.check(TokenType.DOT)) {
        this.advance(); // consume .
        if (!this.check(TokenType.IDENTIFIER)) {
          throw new Error('Expected identifier after .');
        }
        path.push(this.advance().value);
      }

      return { type: ExpressionType.REFERENCE, path };
    }

    // Parenthesized expression
    if (this.check(TokenType.LPAREN)) {
      this.advance(); // consume (
      const expr = this.parseExpression();
      if (!this.check(TokenType.RPAREN)) {
        throw new Error('Expected )');
      }
      this.advance(); // consume )
      return expr;
    }

    throw new Error(`Unexpected token: ${this.peek().type}`);
  }

  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }
}
