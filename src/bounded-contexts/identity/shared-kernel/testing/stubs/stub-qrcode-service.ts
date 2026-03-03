/**
 * Stub QR Code Service
 *
 * Test double for QR code generation.
 */

import type { QrCodeServicePort } from '../../../two-factor-auth/ports/outbound/qrcode-service.port';

export class StubQrCodeService implements QrCodeServicePort {
  private dataUrl = 'data:image/png;base64,TESTQRCODE';

  async generateDataUrl(_text: string): Promise<string> {
    return this.dataUrl;
  }

  // Test helpers
  setDataUrl(url: string): void {
    this.dataUrl = url;
  }

  static withDataUrl(url: string): StubQrCodeService {
    const service = new StubQrCodeService();
    service.setDataUrl(url);
    return service;
  }
}
