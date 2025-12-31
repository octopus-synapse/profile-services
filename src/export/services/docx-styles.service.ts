/**
 * DOCX Styles Service
 * Handles document styling for DOCX exports
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class DocxStylesService {
  /**
   * Get document styles configuration
   */
  getDocumentStyles() {
    return {
      paragraphStyles: [
        {
          id: 'default',
          name: 'Default',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Calibri', size: 22 },
        },
      ],
    };
  }
}
