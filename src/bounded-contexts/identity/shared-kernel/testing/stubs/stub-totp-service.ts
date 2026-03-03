/**
 * Stub TOTP Service
 *
 * Test double for TOTP operations (time-based one-time passwords).
 */

import type {
  TotpSecret,
  TotpServicePort,
} from '../../../two-factor-auth/ports/outbound/totp-service.port';

export class StubTotpService implements TotpServicePort {
  private generatedSecret: TotpSecret = {
    base32: 'JBSWY3DPEHPK3PXP',
    otpauthUrl: 'otpauth://totp/ProFile?secret=JBSWY3DPEHPK3PXP',
  };
  private shouldVerify = true;

  generateSecret(_label: string, _issuer: string): TotpSecret {
    return this.generatedSecret;
  }

  verifyToken(_secret: string, _token: string, _window?: number): boolean {
    return this.shouldVerify;
  }

  // Test helpers
  setGeneratedSecret(base32: string, otpauthUrl: string): void {
    this.generatedSecret = { base32, otpauthUrl };
  }

  setShouldVerify(value: boolean): void {
    this.shouldVerify = value;
  }

  static withSecret(base32: string, otpauthUrl: string): StubTotpService {
    const service = new StubTotpService();
    service.setGeneratedSecret(base32, otpauthUrl);
    return service;
  }

  static alwaysValid(): StubTotpService {
    const service = new StubTotpService();
    service.setShouldVerify(true);
    return service;
  }

  static alwaysInvalid(): StubTotpService {
    const service = new StubTotpService();
    service.setShouldVerify(false);
    return service;
  }
}
