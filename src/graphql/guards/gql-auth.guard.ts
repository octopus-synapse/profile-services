import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * GraphQL Auth Guard
 *
 * Adapts JWT authentication for GraphQL context.
 * Extracts user from GraphQL context instead of HTTP request.
 *
 * Issue #76: Add authentication to GraphQL endpoints
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  /**
   * Convert GraphQL execution context to HTTP context for passport
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
