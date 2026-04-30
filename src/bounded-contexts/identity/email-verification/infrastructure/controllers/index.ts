/**
 * Infrastructure Controllers
 *
 * Only DTOs remain — HTTP endpoints are now declared in
 * `email-verification.routes.ts` and synthesized into Nest controllers
 * by `synthesizeRouteControllers`.
 */

export * from './send-verification.dto';
export * from './verify-email.dto';
