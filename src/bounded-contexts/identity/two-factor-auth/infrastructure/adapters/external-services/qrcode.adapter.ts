/**
 * QR Code Adapter
 *
 * Implementation of QrCodeServicePort using qrcode library.
 */

import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import type { QrCodeServicePort } from '../../../domain/ports/qrcode-service.port';

@Injectable()
export class QrCodeAdapter implements QrCodeServicePort {
  async generateDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text);
  }
}
