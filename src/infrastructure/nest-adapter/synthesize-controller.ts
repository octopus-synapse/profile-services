/**
 * Turns a framework-free `Route` descriptor into a Nest `@Controller`
 * class at runtime. The synthesized class has a single async method
 * decorated with the right HTTP verb decorator and a `@Req()`
 * parameter; the use-case bundle that the handler depends on is
 * injected via the constructor (using a DI token supplied by the
 * caller).
 *
 * Why not lean on Nest's `@Body`/`@Query`/`@Param` decorators? Those
 * push validation and type metadata into the controller class — which
 * is exactly the coupling we're escaping. A single `@Req()` plus
 * Zod-driven parsing keeps Nest's involvement minimal.
 */

import {
  Controller,
  Delete,
  Get,
  Head,
  HttpCode,
  HttpStatus,
  Inject,
  Options,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { RequirePermission } from '@/shared-kernel/authorization';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { HttpMethod, Route } from '@/shared-kernel/http/route';

const METHOD_DECORATORS: Record<HttpMethod, (path?: string) => MethodDecorator> = {
  GET: Get,
  POST: Post,
  PUT: Put,
  PATCH: Patch,
  DELETE: Delete,
  HEAD: Head,
  OPTIONS: Options,
};

/** Status code defaults that mirror Nest's behaviour: POST → 201,
 *  everything else → 200. Routes can override via a future
 *  `Route.statusCode` field — none of today's endpoints need it. */
function defaultStatusFor(method: HttpMethod): HttpStatus {
  return method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK;
}

/** Builds an `HttpCtx` from an Express request. Body/query/params are
 *  parsed against the Route's Zod schemas; failures throw and bubble
 *  up to the existing exception filter (mapped to 400 today). */
function buildCtx<TBundle>(route: Route<TBundle>, req: Request): HttpCtx {
  const body = route.body ? route.body.parse(req.body) : req.body;
  const query = route.query ? route.query.parse(req.query) : req.query;
  const params = route.params ? route.params.parse(req.params) : req.params;

  return {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body,
    query: query as HttpCtx['query'],
    params: params as HttpCtx['params'],
    user: (req as Request & { user?: HttpCtx['user'] }).user ?? null,
    state: {},
  };
}

/**
 * Generates an anonymous Nest controller class for one Route. The
 * class injects the supplied DI token (the use-case bundle) via its
 * constructor and forwards each request to `route.handler(ctx, bundle)`.
 */
export function synthesizeController<TBundle>(
  route: Route<TBundle>,
  bundleToken: abstract new (...args: never[]) => TBundle,
): new (
  ...args: never[]
) => unknown {
  class GeneratedController {
    constructor(public readonly bundle: TBundle) {}

    async handle(req: Request): Promise<unknown> {
      const ctx = buildCtx(route, req);
      return route.handler(ctx, this.bundle);
    }
  }

  // Nest's controller name shows up in logs/swagger; using the route's
  // method+path keeps it diagnosable.
  Object.defineProperty(GeneratedController, 'name', {
    value: `Route_${route.method}_${route.path.replace(/[^A-Za-z0-9]+/g, '_')}`,
  });
  Controller(route.path)(GeneratedController);

  // Inject the bundle. We can't rely on metadata-based DI because the
  // class is generated dynamically; instead we use `@Inject(token)` on
  // the first constructor parameter.
  Inject(bundleToken)(GeneratedController, undefined as unknown as string, 0);

  if (route.openapi.tags.length > 0) {
    ApiTags(...route.openapi.tags)(GeneratedController);
  }

  // SDK export — first tag drives the SDK service name.
  if (route.sdk?.exported) {
    const tag = route.openapi.tags[0] ?? 'default';
    SdkExport({
      tag,
      description: route.openapi.description ?? route.openapi.summary,
      requiresAuth: route.auth.kind !== 'public',
    })(GeneratedController);
  }

  // Decorate the `handle` method with the verb + status + swagger op.
  const proto = GeneratedController.prototype;
  const methodDescriptor = Object.getOwnPropertyDescriptor(proto, 'handle')!;
  const verb = METHOD_DECORATORS[route.method];
  verb()(proto, 'handle', methodDescriptor);
  HttpCode(defaultStatusFor(route.method))(proto, 'handle', methodDescriptor);
  ApiOperation({
    summary: route.openapi.summary,
    description: route.openapi.description,
  })(proto, 'handle', methodDescriptor);

  // Auth: 'public' / 'optional' skip the global JwtAuthGuard;
  // 'jwt' adds the bearer-auth swagger annotation.
  if (route.auth.kind === 'public' || route.auth.kind === 'optional') {
    Public()(proto, 'handle', methodDescriptor);
  } else {
    ApiBearerAuth('JWT-auth')(proto, 'handle', methodDescriptor);
  }

  // Permission gate.
  if (route.permission) {
    RequirePermission(route.permission)(proto, 'handle', methodDescriptor);
  }

  // Single `@Req()` parameter on `handle`.
  Req()(proto, 'handle', 0);

  return GeneratedController;
}
