/**
 * Route descriptors for the export BC. Replaces the four legacy Nest
 * controllers (banner / pdf / docx / multi-format). Each handler stays
 * a wire: it sanitizes inputs, delegates to `ExportPipelineService`
 * (which owns the Requested/Completed/Failed event lifecycle and the
 * 500 translation), and returns a `StreamableFile` from the buffer —
 * the synthesizer's `Res({ passthrough: true })` lets the
 * `StreamableFile` flow through Nest's response interceptor unchanged.
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// ─── Schemas ─────────────────────────────────────────────────────────
export const BannerQuery = z.object({
  palette: z.string().optional(),
  logo: z.string().optional(),
});
export const ResumePdfQuery = z.object({
  palette: z.string().optional(),
  lang: z.string().optional(),
  bannerColor: z.string().optional(),
  template: z.string().optional(),
});
export const ResumeIdParams = z.object({ resumeId: z.string() });
export const UserIdParams = z.object({ userId: z.string() });
export const JsonExportQuery = z.object({ format: z.string().optional() });
export const LatexExportQuery = z.object({ template: z.string().optional() });

export const PDF_HEADERS = {
  'Content-Type': 'application/pdf',
  'Content-Disposition': 'attachment; filename="resume.pdf"',
} as const;

export const DOCX_HEADERS = {
  'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'Content-Disposition': 'attachment; filename="resume.docx"',
} as const;

export const BANNER_HEADERS = {
  'Content-Type': 'image/png',
  'Content-Disposition': 'attachment; filename="linkedin-banner.png"',
} as const;

// Base64 PDF JSON envelope used by the admin "fetch another user's
// resume" endpoint where streaming the PDF directly is not viable.
export const PdfBase64ResponseSchema = z.object({
  pdf: z.string(),
  filename: z.string(),
});

// Pre-signed download envelope. Backend uploads the binary to MinIO with
// a private ACL and returns a signed GET URL with short TTL. Browser
// downloads natively via `<a href={downloadUrl} download={filename}>` —
// frontend never touches blob/atob/MIME logic.
export const PresignedDownloadResponseSchema = z.object({
  downloadUrl: z.string().url(),
  filename: z.string(),
  expiresAt: IsoDateTimeSchema,
});
