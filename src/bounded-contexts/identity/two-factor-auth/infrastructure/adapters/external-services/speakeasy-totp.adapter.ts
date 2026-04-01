/**
 * Speakeasy TOTP Adapter
 *
 * Implementation of TotpServicePort using speakeasy library.
 */

import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import type { TotpSecret, TotpServicePort } from '../../../domain/ports/totp-service.port';

const DEFAULT_WINDOW = 1; // Allow 1 time step before/after (90s total - industry standard)

@Injectable()
export class SpeakeasyTotpAdapter implements TotpServicePort {
  generateSecret(label: string, issuer: string): TotpSecret {
    const secret = speakeasy.generateSecret({
      name: label,
      issuer,
      length: 32,
    });

    return {
      base32: secret.base32,
      otpauthUrl: secret.otpauth_url ?? '',
    };
  }

  verifyToken(secret: string, token: string, window = DEFAULT_WINDOW): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window,
    });
  }
}
