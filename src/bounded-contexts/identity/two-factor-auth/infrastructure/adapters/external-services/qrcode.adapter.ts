/**
 * QR Code Adapter
 *
 * Implementation of QrCodeServicePort using qrcode library.
 */

import * as QRCode from 'qrcode';
import { QrCodeServicePort } from '../../../domain/ports/qrcode-service.port';

export class QrCodeAdapter implements QrCodeServicePort {
  async generateDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text);
  }
}
