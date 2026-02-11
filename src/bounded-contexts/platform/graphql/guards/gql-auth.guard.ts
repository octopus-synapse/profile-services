import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

/**
 * GraphQL Auth Guard
 *
 * Adapts JWT authentication for GraphQL context.
 * Extracts user from GraphQL context instead of HTTP request.
 *
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext): Express.Request {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
