import { describe, expect, it } from 'bun:test';
import { BodyTooLargeException, readBodyCapped } from './streaming-fetch';

function streamOfBytes(byteLengths: number[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= byteLengths.length) {
        controller.close();
        return;
      }
      controller.enqueue(new Uint8Array(byteLengths[i]));
      i += 1;
    },
  });
}

describe('readBodyCapped (P1 #45, #46, #51)', () => {
  it('returns the full buffer when the body is under the cap', async () => {
    const stream = streamOfBytes([100, 200, 100]);
    const buf = await readBodyCapped(stream, 1024);
    expect(buf.byteLength).toBe(400);
  });

  it('throws BodyTooLargeException and cancels the stream when the cap is crossed', async () => {
    const stream = streamOfBytes([500, 500, 500, 500]); // 2 KB total
    await expect(readBodyCapped(stream, 1024)).rejects.toThrow(BodyTooLargeException);
  });

  it('uses 1 MB as the default cap', async () => {
    const stream = streamOfBytes([2 * 1024 * 1024]); // 2 MB
    await expect(readBodyCapped(stream)).rejects.toThrow(BodyTooLargeException);
  });

  it('carries the configured cap on the exception', async () => {
    const stream = streamOfBytes([2048]);
    try {
      await readBodyCapped(stream, 1024);
      throw new Error('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(BodyTooLargeException);
      expect((err as BodyTooLargeException).maxBytes).toBe(1024);
    }
  });
});
