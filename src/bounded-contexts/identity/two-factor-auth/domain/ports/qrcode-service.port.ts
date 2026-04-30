/**
 * QR Code Service Port (Outbound)
 *
 * Defines the contract for QR code generation.
 * Implementation uses qrcode library.
 */

export abstract class QrCodeServicePort {
  /**
   * Generate a QR code data URL from text
   */
  abstract generateDataUrl(text: string): Promise<string>;
}
