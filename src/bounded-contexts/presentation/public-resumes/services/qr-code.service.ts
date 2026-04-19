import { BadRequestException, Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

export interface QrCodeOptions {
  size?: number;
}

@Injectable()
export class QrCodeService {
  async generatePng(url: string, options: QrCodeOptions = {}): Promise<Buffer> {
    if (!url) {
      throw new BadRequestException('URL is required');
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
      throw new BadRequestException('URL is required');
    }

    return QRCode.toString(url, {
      type: 'svg',
      width: options.size ?? 256,
      errorCorrectionLevel: 'M',
      margin: 2,
    });
  }
}
