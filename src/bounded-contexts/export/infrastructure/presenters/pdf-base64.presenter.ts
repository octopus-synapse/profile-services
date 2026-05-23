/**
 * Wraps a freshly generated PDF buffer in the JSON envelope used by the
 * "fetch another user's resume" admin endpoint, where streaming the PDF
 * directly is not viable (the call sits behind a JSON-only proxy in the
 * frontend).
 */
export interface PdfBase64Payload {
  readonly pdf: string;
  readonly filename: string;
}

export function toPdfBase64ResponseDto(buffer: Buffer, filename = 'resume.pdf'): PdfBase64Payload {
  return { pdf: buffer.toString('base64'), filename };
}
