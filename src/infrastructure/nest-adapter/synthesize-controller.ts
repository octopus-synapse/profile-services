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
  Sse,
  StreamableFile,
  type Type,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { from, type Observable } from 'rxjs';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { RequirePermission } from '@/shared-kernel/authorization';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { COOKIE_JAR_KEY, type PendingCookieJar } from '@/shared-kernel/http/cookie-jar';
import type { GuardSpec, HttpMethod, Route } from '@/shared-kernel/http/route';
import { isRedirect, isResponseWithHeaders } from '@/shared-kernel/http/route';

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
  /**
   * Escape hatch for guards that read multiple metadata keys
   * (`RequireMinQualityGuard` reads both `requireMinQuality` and
   * `requireMinQualityResumeParam`). Receives the raw `metadata`
   * payload from the `Route.guards[*]` entry plus the synthesized
   * handler function — call `Reflect.defineMetadata(key, value, target)`
   * for each key the guard expects. When set, `metadataKey` /
   * `mapMetadata` are ignored.
   */
  readonly applyMetadata?: (
    metadata: Record<string, unknown> | undefined,
    target: object,
  ) => void;
};

export type GuardRegistry = Readonly<Record<string, GuardEntry>>;

function flushCookieJar(ctx: HttpCtx, res: Response): void {
  const jar = (ctx.state as Record<string, unknown>)[COOKIE_JAR_KEY] as
    | PendingCookieJar
    | undefined;
  if (!jar) return;
  for (const { name, value, options } of jar.sets) {
    const opts = options ?? {};
    const expires = opts.maxAge !== undefined ? new Date(Date.now() + opts.maxAge) : undefined;
    res.cookie(name, value, {
      ...opts,
      ...(expires ? { expires } : {}),
    });
  }
  for (const { name, options } of jar.clears) {
    res.clearCookie(name, options ?? {});
  }
}

function buildCtx<TBundle>(route: Route<TBundle>, req: Request): HttpCtx {
  const body = route.body ? route.body.parse(req.body) : req.body;
  const query = route.query ? route.query.parse(req.query) : req.query;
  const params = route.params ? route.params.parse(req.params) : req.params;

  const xff = req.headers['x-forwarded-for'];
  const xffFirst = Array.isArray(xff) ? xff[0] : xff;
  const ip = xffFirst?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;

  const ua = req.headers['user-agent'];
  const userAgent = Array.isArray(ua) ? ua[0] : ua;

  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};

  return {
    method: req.method,
    path: req.path,
    headers: req.headers,
    cookies,
    ip,
    userAgent,
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
  const isSse = route.kind === 'sse';
  const isMultipart = route.kind === 'multipart';

  class GeneratedController {
    constructor(public readonly bundle: TBundle) {}

    async handle(
      req: Request,
      res: Response,
      uploadedFile?: Express.Multer.File,
    ): Promise<unknown> {
      const ctx = buildCtx(route, req);
      if (isMultipart && uploadedFile) {
        // Inject the uploaded file into ctx.body so handlers can read it
        // alongside any existing form fields.
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        (ctx as { body: unknown }).body = { ...body, file: uploadedFile };
      }
      const result = await route.handler(ctx, this.bundle);
      flushCookieJar(ctx, res);
      if (isRedirect(result)) {
        res.redirect(result.status, result.url);
        return undefined;
      }
      if (isResponseWithHeaders(result)) {
        for (const [key, value] of Object.entries(result.headers)) {
          res.setHeader(key, value);
        }
        return result.body;
      }
      if (isSse) {
        // The handler returned an Observable / async-iterable; pass it
        // through unchanged. Nest's `@Sse` decorator handles the rest.
        return result as Observable<unknown>;
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
  if (isSse) {
    // SSE routes use Nest's `@Sse('path')` instead of the verb decorators.
    Sse()(proto, 'handle', methodDescriptor);
  } else {
    const verb = METHOD_DECORATORS[route.method];
    verb()(proto, 'handle', methodDescriptor);
    const status = route.statusCode ?? defaultStatusFor(route.method);
    HttpCode(status)(proto, 'handle', methodDescriptor);
  }

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

  // The handler signature is `(req, res, uploadedFile?)`. `@Res()` runs
  // in passthrough mode so the response interceptor stays active.
  Req()(proto, 'handle', 0);
  Res({ passthrough: true })(proto, 'handle', 1);

  if (isMultipart) {
    // Multipart: wire FileInterceptor and `@UploadedFile()` on the
    // third parameter. OpenAPI gets the standard binary-file body.
    UseInterceptors(FileInterceptor('file'))(proto, 'handle', methodDescriptor);
    UploadedFile()(proto, 'handle', 2);
    ApiConsumes('multipart/form-data')(proto, 'handle', methodDescriptor);
    ApiBody({
      schema: {
        type: 'object',
        properties: { file: { type: 'string', format: 'binary' } },
      },
    })(proto, 'handle', methodDescriptor);
  }

  return GeneratedController;
}

/** Marker used by the SSE plumbing — accepting any iterable from the
 *  route handler and converting it to an `Observable` so Nest's `@Sse`
 *  decorator is happy. */
export function asSseObservable<T>(source: AsyncIterable<T>): Observable<T> {
  return from(source);
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
  if (entry.applyMetadata) {
    entry.applyMetadata(spec.metadata, methodDescriptor.value as object);
  } else if (entry.metadataKey) {
    const value = entry.mapMetadata ? entry.mapMetadata(spec.metadata) : (spec.metadata ?? true);
    // Use Reflect-based metadata setter to avoid pulling Nest's
    // `SetMetadata` decorator factory through a fragile invocation path.
    Reflect.defineMetadata(entry.metadataKey, value, methodDescriptor.value);
  }
  UseGuards(entry.guard)(proto, 'handle', methodDescriptor);
}
