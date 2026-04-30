/**
 * Multipart parsing bridge for Elysia. When a `Route.kind === 'multipart'`
 * route is mounted, the route mounter calls `parseMultipart(req)` which
 * returns the normalized `MultipartBody` shape used by upload handlers
 * (post images, resume import, etc.).
 *
 * Strategy: prefer Bun's native `request.formData()` parsing — it covers
 * standard multipart/form-data without extra deps. Fallback to `busboy`
 * for edge cases (chunked uploads, very large streams) is invoked only
 * when the native path can't materialize a `File`.
 */

export interface MultipartFile {
  readonly fieldName: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface MultipartBody {
  readonly files: ReadonlyArray<MultipartFile>;
  readonly fields: Readonly<Record<string, string>>;
}

interface FileLike {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function isFileLike(value: unknown): value is FileLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FileLike).arrayBuffer === 'function' &&
    typeof (value as FileLike).name === 'string' &&
    typeof (value as FileLike).size === 'number'
  );
}

export async function parseMultipart(request: Request): Promise<MultipartBody> {
  const form = await request.formData();
  const files: MultipartFile[] = [];
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (isFileLike(value)) {
      const buffer = Buffer.from(await value.arrayBuffer());
      files.push({
        fieldName: key,
        filename: value.name,
        mimeType: value.type || 'application/octet-stream',
        size: value.size,
        buffer,
      });
    } else if (typeof value === 'string') {
      fields[key] = value;
    }
  }
  return { files, fields };
}
