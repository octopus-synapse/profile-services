/**
 * Infrastructure Controllers
 *
 * Only DTOs remain — HTTP endpoints are now declared in
 * `email-verification.routes.ts` and synthesized into Nest controllers
 * by `synthesizeRouteControllers`.
 */

export * from './send-verification.schema';
export * from './verify-email.schema';
