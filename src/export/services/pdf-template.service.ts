/**
 * PDF Template Service
 * Handles PDF template configuration and styling
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PdfPageSetup, PdfStyleExtractor } from '../helpers';
import { PDF } from '../constants/ui.constants';

@Injectable()
export class PdfTemplateService {
  private readonly pageSetup: PdfPageSetup;
  private readonly styleExtractor: PdfStyleExtractor;

  constructor(private readonly configService: ConfigService) {
    this.pageSetup = new PdfPageSetup(configService);
    this.styleExtractor = new PdfStyleExtractor();
  }

  /**
   * Get page setup helper
   */
  getPageSetup(): PdfPageSetup {
    return this.pageSetup;
  }

  /**
   * Get style extractor helper
   */
  getStyleExtractor(): PdfStyleExtractor {
    return this.styleExtractor;
  }

  /**
   * Get PDF configuration constants
   */
  getPdfConfig() {
    return {
      width: `${PDF.A3_WIDTH_MM}mm`,
      margin: PDF.MARGIN,
      printBackground: true,
      preferCSSPageSize: false,
    };
  }
}
