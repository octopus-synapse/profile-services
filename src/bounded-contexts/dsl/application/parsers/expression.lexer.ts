/**
 * Expression Lexer
 *
 * Tokenizes DSL expressions for theme definitions.
 * Handles expressions like: ${lighten(colors.primary, 20)}
 */

export enum TokenType {
  // Literals
  STRING = 'STRING', // Plain text outside expressions
  STRING_LITERAL = 'STRING_LITERAL', // Quoted strings inside expressions
  NUMBER = 'NUMBER',
  IDENTIFIER = 'IDENTIFIER',

  // Delimiters
  EXPR_START = 'EXPR_START', // ${
  EXPR_END = 'EXPR_END', // }
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  COMMA = 'COMMA', // ,
  DOT = 'DOT', // .

  // Operators
  PLUS = 'PLUS', // +
  MINUS = 'MINUS', // -
  STAR = 'STAR', // *
  SLASH = 'SLASH', // /
  EQUALS = 'EQUALS', // ==

  // Special
  EOF = 'EOF',
  ERROR = 'ERROR',
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export class ExpressionLexer {
  private readonly input: string;
  private position = 0;
  private tokens: Token[] = [];
  private inExpression = false;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.inExpression = false;

    while (!this.isAtEnd()) {
      if (this.inExpression) {
        this.scanExpressionToken();
      } else {
        this.scanOutsideExpression();
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', position: this.position });
    return this.tokens;
  }

  private scanOutsideExpression(): void {
    const start = this.position;

    // Check for expression start
    if (this.match('${')) {
      this.tokens.push({ type: TokenType.EXPR_START, value: '${', position: start });
      this.inExpression = true;
      return;
    }

    // Collect plain text until next expression or end
    let value = '';
    while (!this.isAtEnd() && !this.check('${')) {
      value += this.advance();
    }

    if (value) {
      this.tokens.push({ type: TokenType.STRING, value, position: start });
    }
  }

  private scanExpressionToken(): void {
    this.skipWhitespace();

    if (this.isAtEnd()) return;

    const start = this.position;
    const char = this.peek();

    // Check for expression end
    if (char === '}') {
      this.advance();
      this.tokens.push({ type: TokenType.EXPR_END, value: '}', position: start });
      this.inExpression = false;
      return;
    }

    // Single character tokens
    if (char === '(') {
      this.advance();
      this.tokens.push({ type: TokenType.LPAREN, value: '(', position: start });
      return;
    }

    if (char === ')') {
      this.advance();
      this.tokens.push({ type: TokenType.RPAREN, value: ')', position: start });
      return;
    }

    if (char === ',') {
      this.advance();
      this.tokens.push({ type: TokenType.COMMA, value: ',', position: start });
      return;
    }

    if (char === '.') {
      this.advance();
      this.tokens.push({ type: TokenType.DOT, value: '.', position: start });
      return;
    }

    if (char === '+') {
      this.advance();
      this.tokens.push({ type: TokenType.PLUS, value: '+', position: start });
      return;
    }

    if (char === '-') {
      this.advance();
      this.tokens.push({ type: TokenType.MINUS, value: '-', position: start });
      return;
    }

    if (char === '*') {
      this.advance();
      this.tokens.push({ type: TokenType.STAR, value: '*', position: start });
      return;
    }

    if (char === '/') {
      this.advance();
      this.tokens.push({ type: TokenType.SLASH, value: '/', position: start });
      return;
    }

    // Double character tokens
    if (this.match('==')) {
      this.tokens.push({ type: TokenType.EQUALS, value: '==', position: start });
      return;
    }

    // String literals
    if (char === "'" || char === '"') {
      this.scanStringLiteral(char);
      return;
    }

    // Numbers
    if (this.isDigit(char)) {
      this.scanNumber();
      return;
    }

    // Identifiers
    if (this.isAlpha(char)) {
      this.scanIdentifier();
      return;
    }

    // Unknown character - error
    this.tokens.push({ type: TokenType.ERROR, value: char, position: start });
    this.advance();
  }

  private scanStringLiteral(quote: string): void {
    const start = this.position;
    this.advance(); // consume opening quote

    let value = '';
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\' && this.peekNext() === quote) {
        this.advance(); // consume backslash
        value += this.advance(); // consume escaped quote
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      // Unclosed string
      this.tokens.push({ type: TokenType.ERROR, value, position: start });
      return;
    }

    this.advance(); // consume closing quote
    this.tokens.push({ type: TokenType.STRING_LITERAL, value, position: start });
  }

  private scanNumber(): void {
    const start = this.position;
    let value = '';

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Check for decimal
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume '.'
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.tokens.push({ type: TokenType.NUMBER, value, position: start });
  }

  private scanIdentifier(): void {
    const start = this.position;
    let value = '';

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    this.tokens.push({ type: TokenType.IDENTIFIER, value, position: start });
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private peek(): string {
    return this.input[this.position] ?? '';
  }

  private peekNext(): string {
    return this.input[this.position + 1] ?? '';
  }

  private advance(): string {
    return this.input[this.position++] ?? '';
  }

  private check(expected: string): boolean {
    return this.input.slice(this.position, this.position + expected.length) === expected;
  }

  private match(expected: string): boolean {
    if (this.check(expected)) {
      this.position += expected.length;
      return true;
    }
    return false;
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }
}
