import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

const MAX_NAME_CHARS = 60;
const MAX_TITLE_CHARS = 80;

export interface OgImageInput {
  name: string;
  title?: string | null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function buildShareOgSvg(input: OgImageInput): string {
  const name = truncate(input.name?.trim() || 'Profile', MAX_NAME_CHARS);
  const title = truncate((input.title ?? '').trim() || 'Resume', MAX_TITLE_CHARS);

  const safeName = escapeXml(name);
  const safeTitle = escapeXml(title);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(80,180)">
    <text x="0" y="0" fill="#F8FAFC" font-family="-apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="84" font-weight="700">${safeName}</text>
    <text x="0" y="80" fill="#CBD5F5" font-family="-apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="400">${safeTitle}</text>
    <text x="0" y="300" fill="#94A3B8" font-family="-apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="500" letter-spacing="6">PATCH CAREERS</text>
  </g>
</svg>`;
}

@Injectable()
export class OgImageService {
  async generatePng(input: OgImageInput): Promise<Buffer> {
    const svg = buildShareOgSvg(input);
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  generateSvg(input: OgImageInput): string {
    return buildShareOgSvg(input);
  }
}
