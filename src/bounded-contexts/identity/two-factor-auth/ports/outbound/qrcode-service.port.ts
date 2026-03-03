/**
 * QR Code Service Port (Outbound)
 *
 * Defines the contract for QR code generation.
 * Implementation uses qrcode library.
 */

export interface QrCodeServicePort {
  /**
   * Generate a QR code data URL from text
   */
  generateDataUrl(text: string): Promise<string>;
}

export const QR_CODE_SERVICE_PORT = Symbol('QrCodeServicePort');
