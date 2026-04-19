import { describe, expect, it } from 'bun:test';
import { buildShareOgSvg, OgImageService } from './og-image.service';

describe('buildShareOgSvg', () => {
  it('escapes XML-special characters in name and title', () => {
    const svg = buildShareOgSvg({
      name: 'Enzo & "Friends"',
      title: 'Backend <Engineer> @ Patch',
    });

    expect(svg).toContain('Enzo &amp; &quot;Friends&quot;');
    expect(svg).toContain('Backend &lt;Engineer&gt; @ Patch');
    expect(svg).not.toContain('"Friends"');
  });

  it('always produces a 1200x630 viewBox (canonical OG aspect)', () => {
    const svg = buildShareOgSvg({ name: 'Maria', title: 'Designer' });
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
  });

  it('includes both name and title text nodes', () => {
    const svg = buildShareOgSvg({ name: 'Maria Silva', title: 'Senior Designer' });
    expect(svg).toContain('Maria Silva');
    expect(svg).toContain('Senior Designer');
  });

  it('falls back to a generic title when none is provided', () => {
    const svg = buildShareOgSvg({ name: 'Maria', title: undefined });
    expect(svg).toContain('Resume');
  });

  it('truncates very long names so layout never overflows', () => {
    const longName = 'A'.repeat(120);
    const svg = buildShareOgSvg({ name: longName, title: 'Engineer' });
    // Only the first 60 chars + an ellipsis should appear.
    expect(svg).toContain('A'.repeat(60));
    expect(svg).toContain('…');
    expect(svg).not.toContain('A'.repeat(120));
  });
});

describe('OgImageService', () => {
  const service = new OgImageService();

  it('produces a PNG buffer with valid magic bytes', async () => {
    const png = await service.generatePng({ name: 'Enzo Ferracini', title: 'Backend Engineer' });

    expect(Buffer.isBuffer(png)).toBe(true);
    expect(png.length).toBeGreaterThan(500);
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png[2]).toBe(0x4e);
    expect(png[3]).toBe(0x47);
  });

  it('produces deterministic output for the same input', async () => {
    const a = await service.generatePng({ name: 'Enzo', title: 'Backend' });
    const b = await service.generatePng({ name: 'Enzo', title: 'Backend' });
    expect(a.equals(b)).toBe(true);
  });

  it('produces different output for different inputs', async () => {
    const a = await service.generatePng({ name: 'Enzo', title: 'Backend' });
    const b = await service.generatePng({ name: 'Maria', title: 'Designer' });
    expect(a.equals(b)).toBe(false);
  });
});
