import * as QRCode from 'qrcode';
import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';

export interface QrCodeOptions {
  size?: number;
}

export class QrCodeService {
  async generatePng(url: string, options: QrCodeOptions = {}): Promise<Buffer> {
    if (!url) {
      throw new ValidationException('URL is required');
    }

    return QRCode.toBuffer(url, {
      type: 'png',
      width: options.size ?? 256,
      errorCorrectionLevel: 'M',
      margin: 2,
    });
  }

  async generateSvg(url: string, options: QrCodeOptions = {}): Promise<string> {
    if (!url) {
      throw new ValidationException('URL is required');
    }

    return QRCode.toString(url, {
      type: 'svg',
      width: options.size ?? 256,
      errorCorrectionLevel: 'M',
      margin: 2,
    });
  }
}
