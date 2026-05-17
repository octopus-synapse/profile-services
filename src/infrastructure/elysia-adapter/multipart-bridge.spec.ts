import { describe, expect, it } from 'bun:test';
import { PayloadTooLargeException, parseMultipart } from './multipart-bridge';

function buildMultipart(file: { name: string; bytes: number; type?: string }): Request {
  const blob = new Blob([new Uint8Array(file.bytes)], {
    type: file.type ?? 'application/octet-stream',
  });
  const form = new FormData();
  form.append('file', blob, file.name);
  return new Request('http://localhost/upload', { method: 'POST', body: form });
}

describe('parseMultipart (P1 #51)', () => {
  it('parses a small multipart payload normally', async () => {
    const req = buildMultipart({ name: 'avatar.png', bytes: 1024, type: 'image/png' });
    const body = await parseMultipart(req, { maxBytes: 4 * 1024 });
    expect(body.files).toHaveLength(1);
    expect(body.files[0].fieldName).toBe('file');
    expect(body.files[0].filename).toBe('avatar.png');
  });

  it('rejects via Content-Length header pre-check before reading the body', async () => {
    // Mock a request where the header is far larger than the cap.
    const blob = new Blob([new Uint8Array(64)]);
    const form = new FormData();
    form.append('file', blob, 'small.bin');
    const baseReq = new Request('http://localhost/upload', { method: 'POST', body: form });
    const fakeHeaders = new Headers(baseReq.headers);
    fakeHeaders.set('content-length', String(10 * 1024 * 1024));
    const lyingReq = new Request(baseReq.url, {
      method: baseReq.method,
      headers: fakeHeaders,
      body: baseReq.body,
    });

    await expect(parseMultipart(lyingReq, { maxBytes: 1024 })).rejects.toThrow(
      PayloadTooLargeException,
    );
  });

  it('rejects via the streaming cap when the body actually exceeds the limit', async () => {
    const req = buildMultipart({ name: 'big.bin', bytes: 8 * 1024 });
    await expect(parseMultipart(req, { maxBytes: 1024 })).rejects.toThrow(PayloadTooLargeException);
  });

  it('reports 413 + PAYLOAD_TOO_LARGE on the typed exception', async () => {
    const req = buildMultipart({ name: 'big.bin', bytes: 4 * 1024 });
    try {
      await parseMultipart(req, { maxBytes: 1024 });
      throw new Error('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(PayloadTooLargeException);
      expect((err as PayloadTooLargeException).statusCode).toBe(413);
      expect((err as PayloadTooLargeException).errorCode).toBe('PAYLOAD_TOO_LARGE');
    }
  });
});
