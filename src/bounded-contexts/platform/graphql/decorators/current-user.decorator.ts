import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * GraphQL Current User Decorator
 *
 * Extracts authenticated user from GraphQL context.
 * Works with GqlAuthGuard to provide user object in resolvers.
 *
 * Usage:
 * ```typescript
 * @Query()
 * async myQuery(@CurrentUser() user: User) {
 *   // user is authenticated
 * }
 * ```
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const ctx = GqlExecutionContext.create(context);
  const request = ctx.getContext<{ req: { user: unknown } }>().req;
  return request.user;
});
