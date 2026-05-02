import * as QRCode from 'qrcode';
import { QrUrlRequiredException } from '../../domain/exceptions/presentation.exceptions';

export interface QrCodeOptions {
  size?: number;
}

export class QrCodeService {
  async generatePng(url: string, options: QrCodeOptions = {}): Promise<Buffer> {
    if (!url) {
      throw new QrUrlRequiredException();
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
      throw new QrUrlRequiredException();
    }

    return QRCode.toString(url, {
      type: 'svg',
      width: options.size ?? 256,
      errorCorrectionLevel: 'M',
      margin: 2,
    });
  }
}
