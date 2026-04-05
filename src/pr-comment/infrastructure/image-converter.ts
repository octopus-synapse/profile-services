/**
 * Image Converter Infrastructure
 *
 * Converts SVG to PNG using sharp.
 */

import sharp from 'sharp';

export interface ImageConverter {
  svgToPng(svg: string): Promise<Buffer>;
  svgToBase64Png(svg: string): Promise<string>;
}

export function createImageConverter(): ImageConverter {
  return {
    async svgToPng(svg: string): Promise<Buffer> {
      const buffer = Buffer.from(svg);
      return sharp(buffer).png().toBuffer();
    },

    async svgToBase64Png(svg: string): Promise<string> {
      const pngBuffer = await this.svgToPng(svg);
      return pngBuffer.toString('base64');
    },
  };
}
