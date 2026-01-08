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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRequest(context: ExecutionContext): any {
    const ctx = GqlExecutionContext.create(context);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return ctx.getContext().req;
  }
}
