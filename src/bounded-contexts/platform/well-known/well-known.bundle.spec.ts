/**
 * Spec: AASA + assetlinks builders (V2 D75).
 *
 * The two builders consume a `WellKnownConfig` shaped from env vars
 * and produce the documents Apple/Google crawlers fetch. Specs cover:
 *  - the "empty" fallback when identifiers aren't configured yet
 *  - the populated shape when env is fully wired
 *  - the deep-link path list flows through the AASA `components`
 */

import { describe, expect, it } from 'bun:test';
import {
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  MOBILE_DEEP_LINK_PATHS,
} from './well-known.bundle';

const FULL_CONFIG = {
  appleTeamId: 'ABCDE12345',
  iosBundleId: 'com.patchcareers.app',
  androidPackageName: 'com.patchcareers.app',
  androidSha256Fingerprints: [
    'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
  ],
};

describe('buildAppleAppSiteAssociation', () => {
  it('returns empty applinks when Apple Team ID is unset', () => {
    const aasa = buildAppleAppSiteAssociation({
      appleTeamId: null,
      iosBundleId: null,
      androidPackageName: null,
      androidSha256Fingerprints: [],
    });
    expect(aasa).toEqual({ applinks: { details: [] } });
  });

  it('returns empty applinks when iOS bundle id is unset', () => {
    const aasa = buildAppleAppSiteAssociation({
      appleTeamId: 'ABCDE12345',
      iosBundleId: null,
      androidPackageName: null,
      androidSha256Fingerprints: [],
    });
    expect(aasa.applinks.details).toEqual([]);
  });

  it('emits TEAM.bundle as appIDs when configured', () => {
    const aasa = buildAppleAppSiteAssociation(FULL_CONFIG);
    expect(aasa.applinks.details[0]?.appIDs).toEqual(['ABCDE12345.com.patchcareers.app']);
  });

  it('lists every MOBILE_DEEP_LINK_PATHS entry in components', () => {
    const aasa = buildAppleAppSiteAssociation(FULL_CONFIG);
    const components = aasa.applinks.details[0]?.components ?? [];
    expect(components.length).toBe(MOBILE_DEEP_LINK_PATHS.length);
    for (const path of MOBILE_DEEP_LINK_PATHS) {
      expect(components).toContainEqual({ '/': path });
    }
  });

  it('includes webcredentials so iOS Password Autofill works in the app', () => {
    const aasa = buildAppleAppSiteAssociation(FULL_CONFIG);
    expect(aasa.webcredentials?.apps).toEqual(['ABCDE12345.com.patchcareers.app']);
  });
});

describe('buildAssetLinks', () => {
  it('returns [] when Android package is unset', () => {
    expect(
      buildAssetLinks({
        appleTeamId: null,
        iosBundleId: null,
        androidPackageName: null,
        androidSha256Fingerprints: ['AA:BB'],
      }),
    ).toEqual([]);
  });

  it('returns [] when fingerprints list is empty', () => {
    expect(
      buildAssetLinks({
        appleTeamId: null,
        iosBundleId: null,
        androidPackageName: 'com.patchcareers.app',
        androidSha256Fingerprints: [],
      }),
    ).toEqual([]);
  });

  it('emits the canonical handle_all_urls statement when fully configured', () => {
    const links = buildAssetLinks(FULL_CONFIG);
    expect(links.length).toBe(1);
    expect(links[0]?.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(links[0]?.target.namespace).toBe('android_app');
    expect(links[0]?.target.package_name).toBe('com.patchcareers.app');
    expect(links[0]?.target.sha256_cert_fingerprints).toEqual(
      FULL_CONFIG.androidSha256Fingerprints,
    );
  });

  it('preserves the order and multiplicity of the fingerprint list', () => {
    const links = buildAssetLinks({
      ...FULL_CONFIG,
      androidSha256Fingerprints: ['AA:01', 'BB:02', 'CC:03'],
    });
    expect(links[0]?.target.sha256_cert_fingerprints).toEqual(['AA:01', 'BB:02', 'CC:03']);
  });
});
