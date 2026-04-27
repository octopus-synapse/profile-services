/**
 * Turns a framework-free `Route` descriptor into a Nest `@Controller`
 * class at runtime. The synthesized class has a single async method
 * decorated with the right HTTP verb decorator; the use-case bundle is
 * injected via the constructor.
 *
 * The synthesizer also handles a handful of cross-cutting concerns:
 *
 *  - Auth: `route.auth.kind === 'public' | 'optional'` adds `@Public()`;
 *    `'jwt'` adds `@ApiBearerAuth('JWT-auth')`.
 *  - Permission: `route.permission` (enum or `(resource, action)` tuple)
 *    is forwarded to `RequirePermission(...)`.
 *  - Custom guards: `route.guards` ids are resolved against the
 *    `guardRegistry` callable that the BC's module passes in (so the
 *    Route descriptor stays framework-free; the registry is Nest-side).
 *  - Status code: `route.statusCode` overrides the default 200/201.
 *  - Static headers: `route.headers` becomes `@Header(k, v)` on the
 *    method.
 *  - Dynamic headers: handlers can `return withHeaders({...}, body)`
 *    and the synthesizer's wrapper unpacks them onto the Express
 *    `Response` object before returning the body.
 */

import {
  Controller,
  Delete,
  Get,
  Head,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Options,
  Patch,
  Post,
  Put,
  Req,
  Res,
  type Type,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { RequirePermission } from '@/shared-kernel/authorization';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { GuardSpec, HttpMethod, Route } from '@/shared-kernel/http/route';
import { isResponseWithHeaders } from '@/shared-kernel/http/route';

const METHOD_DECORATORS: Record<HttpMethod, (path?: string) => MethodDecorator> = {
  GET: Get,
  POST: Post,
  PUT: Put,
  PATCH: Patch,
  DELETE: Delete,
  HEAD: Head,
  OPTIONS: Options,
};

/** Status code defaults that mirror Nest's behaviour. */
function defaultStatusFor(method: HttpMethod): HttpStatus {
  return method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK;
}

/** Maps a guard `id` (e.g. `'rate-limit'`) to a Nest guard class +
 *  optional metadata-key/value pair to set on the synthesized method.
 *  BCs declare their registry next to their `*.module.ts` and pass it
 *  to `synthesizeRouteControllers`. */
export type GuardEntry = {
  readonly guard: Type<unknown>;
  readonly metadataKey?: string;
  /**
   * Mapper that turns `route.guards[*].metadata` into the value passed
   * to `SetMetadata`. Defaults to `metadata => metadata`.
   */
  readonly mapMetadata?: (metadata: Record<string, unknown> | undefined) => unknown;
};

export type GuardRegistry = Readonly<Record<string, GuardEntry>>;

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

export function synthesizeController<TBundle>(
  route: Route<TBundle>,
  bundleToken: abstract new (...args: never[]) => TBundle,
  guardRegistry: GuardRegistry = {},
): new (
  ...args: never[]
) => unknown {
  class GeneratedController {
    constructor(public readonly bundle: TBundle) {}

    async handle(req: Request, res: Response): Promise<unknown> {
      const ctx = buildCtx(route, req);
      const result = await route.handler(ctx, this.bundle);
      if (isResponseWithHeaders(result)) {
        for (const [key, value] of Object.entries(result.headers)) {
          res.setHeader(key, value);
        }
        return result.body;
      }
      return result;
    }
  }

  Object.defineProperty(GeneratedController, 'name', {
    value: `Route_${route.method}_${route.path.replace(/[^A-Za-z0-9]+/g, '_')}`,
  });
  Controller(route.path)(GeneratedController);

  Inject(bundleToken)(GeneratedController, undefined as unknown as string, 0);

  if (route.openapi.tags.length > 0) {
    ApiTags(...route.openapi.tags)(GeneratedController);
  }

  if (route.sdk?.exported) {
    const tag = route.openapi.tags[0] ?? 'default';
    SdkExport({
      tag,
      description: route.openapi.description ?? route.openapi.summary,
      requiresAuth: route.auth.kind !== 'public',
    })(GeneratedController);
  }

  const proto = GeneratedController.prototype;
  const methodDescriptor = Object.getOwnPropertyDescriptor(proto, 'handle')!;
  const verb = METHOD_DECORATORS[route.method];
  verb()(proto, 'handle', methodDescriptor);

  const status = route.statusCode ?? defaultStatusFor(route.method);
  HttpCode(status)(proto, 'handle', methodDescriptor);

  ApiOperation({
    summary: route.openapi.summary,
    description: route.openapi.description,
  })(proto, 'handle', methodDescriptor);

  if (route.headers) {
    for (const [key, value] of Object.entries(route.headers)) {
      Header(key, value)(proto, 'handle', methodDescriptor);
    }
  }

  if (route.auth.kind === 'public' || route.auth.kind === 'optional') {
    Public()(proto, 'handle', methodDescriptor);
  } else {
    ApiBearerAuth('JWT-auth')(proto, 'handle', methodDescriptor);
  }

  if (route.permission) {
    if (typeof route.permission === 'string') {
      RequirePermission(route.permission)(proto, 'handle', methodDescriptor);
    } else {
      RequirePermission(route.permission.resource, route.permission.action)(
        proto,
        'handle',
        methodDescriptor,
      );
    }
  }

  if (route.guards) {
    for (const spec of route.guards) {
      applyGuardSpec(spec, guardRegistry, proto, methodDescriptor);
    }
  }

  // The handler signature is `(req, res)`; both are decorated with
  // `@Req()` and `@Res({ passthrough: true })` so the response wrapping
  // interceptor still runs.
  Req()(proto, 'handle', 0);
  Res({ passthrough: true })(proto, 'handle', 1);

  return GeneratedController;
}

function applyGuardSpec(
  spec: GuardSpec,
  registry: GuardRegistry,
  proto: object,
  methodDescriptor: PropertyDescriptor,
): void {
  const entry = registry[spec.id];
  if (!entry) {
    throw new Error(
      `synthesizeController: guard id "${spec.id}" not found in registry. Register it in the BC's module via synthesizeRouteControllers(token, routes, { guards: { [id]: ... } }).`,
    );
  }
  if (entry.metadataKey) {
    const value = entry.mapMetadata
      ? entry.mapMetadata(spec.metadata)
      : (spec.metadata ?? true);
    // Use Reflect-based metadata setter to avoid pulling Nest's
    // `SetMetadata` decorator factory through a fragile invocation path.
    Reflect.defineMetadata(entry.metadataKey, value, methodDescriptor.value);
  }
  UseGuards(entry.guard)(proto, 'handle', methodDescriptor);
}
