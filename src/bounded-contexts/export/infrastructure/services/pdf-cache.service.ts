import { createHash } from 'node:crypto';
import type { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';

export interface PdfCacheKeyInput {
  /** Owner of the resume — always part of the key (cross-user isolation). */
  readonly userId: string;
  /** Specific resume to render. Omitted = the user's primary resume.
   *  MUST match the resume the render callback targets, otherwise the
   *  key tracks the wrong row's `updatedAt`/style and serves stale PDFs. */
  readonly resumeId?: string;
  /** Free-form render parameters that affect the output. Anything that
   *  changes the byte stream MUST be in here so we don't serve a stale
   *  PDF when the user toggles palette / language / template. */
  readonly renderArgs: Readonly<Record<string, string | undefined>>;
}

/**
 * MinIO-backed cache for rendered resume PDFs.
 *
 * Cache key:
 *   `pdfs/resume/{ userId }-{ resumeId }-{ styleId|none }-{ styleVersion|0 }-
 *    { resumeUpdatedAtMs }-{ renderArgsHash }.pdf`
 *
 * Why these components:
 * - `resumeId`/`styleId`/`styleVersion`: every visual or template
 *   change cuts a new key naturally; no manual eviction.
 * - `resumeUpdatedAtMs`: any content edit bumps the timestamp so the
 *   next render misses the old key. Old keys remain (for reproducibility)
 *   until a future MinIO lifecycle policy reaps them.
 * - `renderArgsHash`: palette/lang/bannerColor/template are part of
 *   the byte stream; changing them must produce a different key.
 *
 * Behaviour on outage:
 * - MinIO disabled (config missing): no cache lookup, no upload, the
 *   render path is identical to the no-cache flow.
 * - Render failure: not our problem — propagate so the controller
 *   keeps its existing error handling.
 * - Upload failure: log + return the buffer anyway (we shouldn't fail
 *   a user-facing PDF download because we couldn't cache it).
 */
export class PdfCacheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3UploadService,
    private readonly logger: LoggerPort,
  ) {}

  async serve(input: PdfCacheKeyInput, render: () => Promise<Buffer>): Promise<Buffer> {
    const key = await this.buildKey(input);
    if (!key) {
      // Couldn't resolve the resume — let render handle the error path.
      return render();
    }

    if (this.s3.isEnabled) {
      try {
        const cached = await this.s3.downloadFile(key);
        if (cached) {
          this.logger.log(`pdf cache hit key=${key}`, 'PdfCacheService');
          return cached;
        }
      } catch (err) {
        this.logger.warn(
          `pdf cache lookup failed key=${key}: ${err instanceof Error ? err.message : 'unknown'}`,
          'PdfCacheService',
        );
      }
    }

    const buffer = await render();

    if (this.s3.isEnabled) {
      try {
        // P2-097 / S3 ACL policy — resume exports are user-scoped
        // artefacts and MUST be private; presigned-GET access is
        // handled by the export route, not by direct CDN URLs.
        await this.s3.uploadFile(buffer, key, 'application/pdf', { acl: 'private' });
      } catch (err) {
        this.logger.warn(
          `pdf cache upload failed key=${key}: ${err instanceof Error ? err.message : 'unknown'}`,
          'PdfCacheService',
        );
      }
    }
    return buffer;
  }

  private async buildKey(input: PdfCacheKeyInput): Promise<string | null> {
    const resume = input.resumeId
      ? // Explicit resume: resolve its own updatedAt/style, scoped to the
        // owner. Foreign/unknown id → null key → cache bypass; the render
        // path 404s via its own ownership check (findOwnedResume).
        await this.prisma.resume.findFirst({
          where: { id: input.resumeId, userId: input.userId },
          select: {
            id: true,
            updatedAt: true,
            styleId: true,
            style: { select: { id: true, version: true } },
          },
        })
      : // Default: the user's primary resume.
        (
          await this.prisma.user.findUnique({
            where: { id: input.userId },
            select: {
              primaryResume: {
                select: {
                  id: true,
                  updatedAt: true,
                  styleId: true,
                  style: { select: { id: true, version: true } },
                },
              },
            },
          })
        )?.primaryResume;
    if (!resume) return null;
    const styleId = resume.style?.id ?? 'none';
    const styleVersion = resume.style?.version ?? 0;
    const argsHash = hashRenderArgs(input.renderArgs);
    return `pdfs/resume/${input.userId}-${resume.id}-${styleId}-${styleVersion}-${resume.updatedAt.getTime()}-${argsHash}.pdf`;
  }
}

function hashRenderArgs(args: Readonly<Record<string, string | undefined>>): string {
  const stable = Object.keys(args)
    .sort()
    .map((k) => `${k}=${args[k] ?? ''}`)
    .join('|');
  return createHash('sha256').update(stable).digest('hex').slice(0, 12);
}
