/**
 * Well-known BC bundle (V2 D75 — mobile Universal Links / App Links).
 *
 * Serves the two static documents Apple + Google require to
 * associate a registered HTTPS domain with a mobile app:
 *
 *  - `/.well-known/apple-app-site-association` (AASA, **no .json
 *    extension** — Apple's CDN rejects the file otherwise)
 *  - `/.well-known/assetlinks.json` (Android App Links)
 *
 * Content is composed from environment variables so we don't bake the
 * Apple Team ID or the Android SHA-256 cert fingerprint into source.
 * Both files default to **empty** detail blocks when env is unset —
 * this lets dev environments serve the route shape (Apple's validator
 * accepts an empty `applinks.details`) without committing app-store
 * identifiers we don't have yet.
 */

import type { LoggerPort } from '@/shared-kernel/logger';

/** AASA top-level shape (subset; Apple accepts unknown fields). */
export interface AppleAppSiteAssociation {
  readonly applinks: {
    readonly details: ReadonlyArray<{
      readonly appIDs: ReadonlyArray<string>;
      readonly components: ReadonlyArray<Record<string, string>>;
    }>;
  };
  readonly webcredentials?: { readonly apps: ReadonlyArray<string> };
}

/** assetlinks.json top-level shape. Always an array of statements. */
export type AssetLinks = ReadonlyArray<{
  readonly relation: ReadonlyArray<string>;
  readonly target: {
    readonly namespace: string;
    readonly package_name: string;
    readonly sha256_cert_fingerprints: ReadonlyArray<string>;
  };
}>;

/**
 * Path components the mobile app handles as deep links. Single source
 * of truth — both AASA and assetlinks reference this list so adding a
 * new deep-linkable path is a one-line change.
 *
 * The AASA `components` field uses path patterns; assetlinks doesn't
 * have a path scope (it's domain-wide), so this is only consumed on
 * the Apple side. Listed here so the entry order matches the build.
 */
export const MOBILE_DEEP_LINK_PATHS: ReadonlyArray<string> = [
  '/jobs/*',
  '/u/*',
  '/resumes/share/*',
  '/applications/*',
  '/reset-password',
];

export interface WellKnownConfig {
  /** Apple Team ID prefix (10-char). Example: `ABCDE12345`. */
  readonly appleTeamId: string | null;
  /** iOS bundle identifier. Example: `com.patchcareers.app`. */
  readonly iosBundleId: string | null;
  /** Android Java package name. Example: `com.patchcareers.app`. */
  readonly androidPackageName: string | null;
  /**
   * Android signing cert SHA-256 fingerprints (production + upload key
   * + Play App Signing). Each entry is the colon-separated uppercase
   * hex digest format Google's keytool emits.
   */
  readonly androidSha256Fingerprints: ReadonlyArray<string>;
}

export interface WellKnownBundle {
  readonly aasa: AppleAppSiteAssociation;
  readonly assetLinks: AssetLinks;
  readonly logger: LoggerPort;
}

/**
 * Build the AASA JSON document from `WellKnownConfig`. When the
 * Apple identifiers aren't set yet (env unconfigured) we still emit
 * the document shell with an **empty** `details` array — Apple's
 * validator accepts this and the route stays predictable.
 */
export function buildAppleAppSiteAssociation(config: WellKnownConfig): AppleAppSiteAssociation {
  if (!config.appleTeamId || !config.iosBundleId) {
    return { applinks: { details: [] } };
  }
  const fullAppId = `${config.appleTeamId}.${config.iosBundleId}`;
  return {
    applinks: {
      details: [
        {
          appIDs: [fullAppId],
          components: MOBILE_DEEP_LINK_PATHS.map((p) => ({ '/': p })),
        },
      ],
    },
    // Enables password autofill from iCloud Keychain into the app.
    webcredentials: { apps: [fullAppId] },
  };
}

/**
 * Build the assetlinks.json document. Empty array when the Android
 * identifiers aren't set yet (env unconfigured) — Google's validator
 * accepts an empty statement list (it just won't enable App Links
 * verification for any package).
 */
export function buildAssetLinks(config: WellKnownConfig): AssetLinks {
  if (!config.androidPackageName || config.androidSha256Fingerprints.length === 0) {
    return [];
  }
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.androidPackageName,
        sha256_cert_fingerprints: [...config.androidSha256Fingerprints],
      },
    },
  ];
}
