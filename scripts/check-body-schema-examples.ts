#!/usr/bin/env bun

import { resolve } from 'node:path';
import { extractBodyExample, loadRoutes } from '../test/infrastructure/contract/engine';

const SRC_DIR = resolve(__dirname, '../src');
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH']);

const routes = await loadRoutes(SRC_DIR);
const offenders: string[] = [];

for (const { file, route } of routes) {
  if (!MUTATION_METHODS.has(route.method)) continue;
  if (!route.body) continue;
  if (extractBodyExample(route.body) === null) {
    offenders.push(`  ${route.method} ${route.path}  (${file.replace(`${SRC_DIR}/`, '')})`);
  }
}

if (offenders.length > 0) {
  console.error(
    `\n${offenders.length} route(s) have a body schema without .openapi({ example: ... }):\n`,
  );
  for (const o of offenders) console.error(o);
  console.error(
    '\nAdd .openapi({ example: { ... } }) at the root of each body schema so the contract test suite can probe these routes.\n',
  );
  process.exit(1);
}

console.log(
  `All ${routes.filter((r) => MUTATION_METHODS.has(r.route.method) && r.route.body).length} mutation body schemas have .openapi({ example }).`,
);
