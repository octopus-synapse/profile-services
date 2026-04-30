/**
 * All HTTP endpoints for the account-lifecycle BC are now declared in
 * `account-lifecycle.routes.ts` and synthesized into Nest controllers
 * by `synthesizeRouteControllers`. This barrel is kept (intentionally
 * empty) so callers that did `import {} from './controllers'` keep
 * type-checking, and so that future hand-written legacy controllers
 * have an obvious home.
 */

export {};
