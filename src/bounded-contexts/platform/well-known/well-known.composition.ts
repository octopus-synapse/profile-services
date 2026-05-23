/**
 * Well-known BC composition root (V2 D75).
 *
 * Pulls Apple/Android identifiers from `ConfigPort`, builds the AASA
 * and assetlinks JSON documents once at boot, and hands them to the
 * route handlers (the docs are static after boot — no per-request
 * work).
 *
 * Env vars consumed (all optional — empty docs when unset):
 *
 *  - APPLE_TEAM_ID                  — `ABCDE12345`
 *  - IOS_BUNDLE_ID                  — `com.patchcareers.app`
 *  - ANDROID_PACKAGE_NAME           — `com.patchcareers.app`
 *  - ANDROID_SHA256_FINGERPRINTS    — CSV of colon-separated hex
 *                                     digests (production + Play
 *                                     App Signing + upload key).
 *
 * TODO(v2-mobile): once the Expo project is provisioned, populate
 * these vars in deployment configs (Render dashboard / CI secrets).
 * Until then both files serve empty-but-valid JSON.
 */

import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import {
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  type WellKnownBundle,
  type WellKnownConfig,
} from './well-known.bundle';
import { wellKnownRoutes } from './well-known.routes';

export type { WellKnownBundle };

function loadConfig(config: ConfigPort): WellKnownConfig {
  const csv = config.getOrDefault<string>('ANDROID_SHA256_FINGERPRINTS', '');
  const androidSha256Fingerprints = csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return {
    appleTeamId: config.get<string>('APPLE_TEAM_ID') ?? null,
    iosBundleId: config.get<string>('IOS_BUNDLE_ID') ?? null,
    androidPackageName: config.get<string>('ANDROID_PACKAGE_NAME') ?? null,
    androidSha256Fingerprints,
  };
}

export function buildWellKnownComposition(
  config: ConfigPort,
  logger: LoggerPort,
): BoundedContextComposition<WellKnownBundle> {
  const cfg = loadConfig(config);
  const aasa = buildAppleAppSiteAssociation(cfg);
  const assetLinks = buildAssetLinks(cfg);

  // Log a single boot-time line so operators can confirm whether the
  // mobile identifiers are wired in this environment. Helps debug
  // "the App Links validator says it can't see my app" — it's
  // probably because the env vars aren't set in this stage.
  const appleConfigured = aasa.applinks.details.length > 0;
  const androidConfigured = assetLinks.length > 0;
  logger.log(
    `Well-known docs ready (apple=${appleConfigured ? 'configured' : 'empty'}, android=${androidConfigured ? 'configured' : 'empty'})`,
    'WellKnownBootstrap',
  );

  const bundle: WellKnownBundle = { aasa, assetLinks, logger };
  return { useCases: bundle, routes: wellKnownRoutes };
}
