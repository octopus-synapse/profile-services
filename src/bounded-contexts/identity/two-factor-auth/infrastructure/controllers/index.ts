/**
 * Infrastructure Controllers
 *
 * HTTP endpoints for the two-factor-auth bounded context. Most routes
 * are now described as `Route` descriptors in `two-factor-auth.routes.ts`
 * and synthesized at module load — only `Disable2faController` remains
 * a hand-rolled Nest controller (it returns 204).
 */

export * from './disable-2fa.controller';
