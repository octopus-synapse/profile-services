/**
 * Application entry-point. Delegates the entire Nest lifecycle to
 * `nestBootstrap` so this file stays adapter-agnostic at the call site
 * — swapping Nest for Elysia/Fastify/Hono will mean importing a
 * different bootstrap from `src/infrastructure/<framework>-adapter/`
 * and changing nothing else here.
 *
 * `AppModule` is still passed in by hand because Nest's runtime needs
 * a decorated module token; once the route descriptors fully replace
 * `@Module`-driven controller registration, that argument goes away.
 */

import { AppModule } from './app.module';
import { nestBootstrap } from './infrastructure/nest-adapter/nest-bootstrap';

void nestBootstrap(AppModule);
