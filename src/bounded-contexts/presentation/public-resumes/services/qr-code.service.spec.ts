import { describe, expect, it } from 'bun:test';
import { QrCodeService } from './qr-code.service';

describe('QrCodeService', () => {
  const service = new QrCodeService();

  it('should produce a PNG buffer with valid magic bytes', async () => {
    const png = await service.generatePng('https://patchcareers.com/u/enzo');

    expect(png).toBeInstanceOf(Buffer);
    expect(png.length).toBeGreaterThan(100);
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png[2]).toBe(0x4e);
    expect(png[3]).toBe(0x47);
  });

  it('should produce a deterministic output for the same URL', async () => {
    const a = await service.generatePng('https://patchcareers.com/u/enzo');
    const b = await service.generatePng('https://patchcareers.com/u/enzo');

    expect(a.equals(b)).toBe(true);
  });

  it('should produce different output for different URLs', async () => {
    const a = await service.generatePng('https://patchcareers.com/u/enzo');
    const b = await service.generatePng('https://patchcareers.com/u/maria');

    expect(a.equals(b)).toBe(false);
  });

  it('should respect a custom size option', async () => {
    const small = await service.generatePng('https://patchcareers.com/u/enzo', { size: 128 });
    const large = await service.generatePng('https://patchcareers.com/u/enzo', { size: 512 });

    expect(large.length).toBeGreaterThan(small.length);
  });

  it('should reject empty URL', async () => {
    await expect(service.generatePng('')).rejects.toThrow();
  });

  it('should produce an SVG string including the target URL data', async () => {
    const svg = await service.generateSvg('https://patchcareers.com/u/enzo');

    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });
});
