/**
 * Token Evaluator
 *
 * Evaluates parsed expression ASTs against a context of resolved tokens.
 */

import {
  DslErrorExpressionException,
  DslEvaluationLimitExceededException,
  DslTypeMismatchException,
  DslUnknownFunctionException,
  DslUnknownOperatorException,
} from '../../domain/exceptions/dsl.exceptions';
import {
  type BinaryExpr,
  type Expression,
  ExpressionParser,
  ExpressionType,
  type FunctionCallExpr,
  type ReferenceExpr,
  type TemplateExpr,
} from '../parsers/expression.parser';
import { colorFunctions } from './color.functions';

type EvalResult = string | number | boolean | undefined | unknown[];

/** Hard cap on the number of `evaluate()` recursions per top-level
 *  call. Bounded to keep an attacker-supplied expression (or a
 *  pathologically nested template) from running indefinitely. */
const EVALUATION_INSTRUCTION_LIMIT = 5_000;

export class TokenEvaluator {
  private instructionsRemaining = EVALUATION_INSTRUCTION_LIMIT;

  constructor(private readonly context: Record<string, unknown>) {}

  /**
   * Evaluate a string that may contain expressions.
   * Returns the resolved value as a string.
   */
  evaluateString(input: string): string {
    this.instructionsRemaining = EVALUATION_INSTRUCTION_LIMIT;
    const parser = new ExpressionParser(input);
    const expr = parser.parse();
    const result = this.evaluate(expr);
    return String(result ?? '');
  }

  /**
   * Evaluate an expression AST against the context.
   */
  evaluate(expr: Expression): EvalResult {
    if (--this.instructionsRemaining <= 0) {
      throw new DslEvaluationLimitExceededException();
    }
    switch (expr.type) {
      case ExpressionType.LITERAL:
        return expr.value;

      case ExpressionType.REFERENCE:
        return this.evaluateReference(expr);

      case ExpressionType.BINARY:
        return this.evaluateBinary(expr);

      case ExpressionType.FUNCTION_CALL:
        return this.evaluateFunction(expr);

      case ExpressionType.TEMPLATE:
        return this.evaluateTemplate(expr);

      case ExpressionType.ERROR:
        throw new DslErrorExpressionException(expr.message);

      default:
        return undefined;
    }
  }

  private evaluateReference(expr: ReferenceExpr): EvalResult {
    let current: unknown = this.context;

    for (const key of expr.path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current as EvalResult;
  }

  private evaluateBinary(expr: BinaryExpr): EvalResult {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator) {
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left ?? '') + String(right ?? '');
        }
        this.assertNumeric(left, right, '+');
        return (left as number) + (right as number);

      case '-':
        this.assertNumeric(left, right, '-');
        return (left as number) - (right as number);

      case '*':
        this.assertNumeric(left, right, '*');
        return (left as number) * (right as number);

      case '/':
        this.assertNumeric(left, right, '/');
        return (left as number) / (right as number);

      case '==':
        return left === right;

      default:
        throw new DslUnknownOperatorException(expr.operator);
    }
  }

  private assertNumeric(left: EvalResult, right: EvalResult, operator: string): void {
    // Booleans are intentionally rejected here — `true - 1` coerces
    // to `0`, which is almost never what the theme author meant.
    const leftOk = typeof left === 'number';
    const rightOk = typeof right === 'number';
    if (leftOk && rightOk) return;
    const got = leftOk ? typeof right : typeof left;
    throw new DslTypeMismatchException(`number on both sides of "${operator}"`, got);
  }

  private evaluateFunction(expr: FunctionCallExpr): EvalResult {
    const args = expr.args.map((arg) => this.evaluate(arg));

    // Built-in functions
    switch (expr.name) {
      case 'when':
        return args[0] ? args[1] : args[2];

      case 'lighten':
        return colorFunctions.lighten(String(args[0]), Number(args[1]));

      case 'darken':
        return colorFunctions.darken(String(args[0]), Number(args[1]));

      case 'alpha':
        return colorFunctions.alpha(String(args[0]), Number(args[1]));

      case 'mix':
        return colorFunctions.mix(String(args[0]), String(args[1]), Number(args[2]));

      case 'saturate':
        return colorFunctions.saturate(String(args[0]), Number(args[1]));

      case 'desaturate':
        return colorFunctions.desaturate(String(args[0]), Number(args[1]));

      case 'contrast':
        return colorFunctions.contrast(String(args[0]));

      case 'round':
        return Math.round(Number(args[0]));

      case 'floor':
        return Math.floor(Number(args[0]));

      case 'ceil':
        return Math.ceil(Number(args[0]));

      case 'min':
        return Math.min(Number(args[0]), Number(args[1]));

      case 'max':
        return Math.max(Number(args[0]), Number(args[1]));

      case 'clamp':
        return Math.min(Math.max(Number(args[0]), Number(args[1])), Number(args[2]));

      case 'pow':
        return Number(args[0]) ** Number(args[1]);

      case 'ifEmpty':
        return args[0] ?? args[1];

      default:
        throw new DslUnknownFunctionException(expr.name);
    }
  }

  private evaluateTemplate(expr: TemplateExpr): string {
    return expr.parts.map((part) => String(this.evaluate(part) ?? '')).join('');
  }
}
