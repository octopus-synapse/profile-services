/**
 * PDF Style Extractor
 * Extracts styles and renders clean page for PDF generation
 */

import { Page } from 'puppeteer';
import { TIMEOUT } from '../constants/ui.constants';

export interface ExtractedStyles {
  linkTags: string[];
  styleTags: string[];
  resumeHTML: string;
  cssVars: string;
}

export class PdfStyleExtractor {
  async extractStyles(page: Page): Promise<ExtractedStyles> {
    return await page.evaluate(() => {
      const linkTags = Array.from(document.querySelectorAll('head link[rel="stylesheet"]')).map(
        (l) => (l as HTMLLinkElement).outerHTML,
      );

      const styleTags = Array.from(document.querySelectorAll('head style')).map(
        (s) => (s as HTMLStyleElement).outerHTML,
      );

      const resumeEl = document.querySelector('#resume');
      const rootStyle = document.documentElement.style;
      const varNames = Array.from(rootStyle).filter((n) => n.startsWith('--'));
      const cssVars = varNames
        .map((name) => `${name}: ${rootStyle.getPropertyValue(name)};`)
        .join(' ');

      return {
        linkTags,
        styleTags,
        resumeHTML: resumeEl ? resumeEl.outerHTML : '',
        cssVars,
      };
    });
  }

  async renderCleanPage(page: Page, pageUrl: string, styles: ExtractedStyles): Promise<void> {
    const origin = new URL(pageUrl).origin;
    const { linkTags, styleTags, resumeHTML, cssVars } = styles;

    await page.setContent(this.buildCleanHtml(origin, linkTags, styleTags, resumeHTML, cssVars), {
      waitUntil: 'domcontentloaded',
    });

    await page.emulateMediaType('print');
    await page.evaluateHandle('document.fonts.ready');
    await new Promise((resolve) => setTimeout(resolve, TIMEOUT.FONT_READY));
  }

  private buildCleanHtml(
    origin: string,
    linkTags: string[],
    styleTags: string[],
    resumeHTML: string,
    cssVars: string,
  ): string {
    return `<!doctype html>
      <html>
        <head>
          <base href="${origin}">
          ${linkTags.join('\n')}
          ${styleTags.join('\n')}
          <style>
            :root { ${cssVars} }
            html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { margin: 0; }
            [data-no-print] { display: none !important; visibility: hidden !important; }
            #resume, #resume * { break-inside: avoid; page-break-inside: avoid; }
            #resume .bg-\\[var\\(--accent\\)\\], #resume .bg-\\[var\\(--accent\\)\\] * { color: #fff !important; }
            #resume a, #resume a:visited, #resume a:active { text-decoration: none !important; outline: none !important; box-shadow: none !important; }
            #resume *:focus { outline: none !important; box-shadow: none !important; }
            #resume [class*="ring-"], #resume [class*="focus:ring-"] { box-shadow: none !important; }
            #resume [class*="border-b"] { border-right: 0 !important; }
          </style>
        </head>
        <body>
          ${resumeHTML}
        </body>
      </html>`;
  }
}
