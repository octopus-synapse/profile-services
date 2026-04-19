import { Inject, Injectable, Logger } from '@nestjs/common';
// pdf-parse v2 ships a class-based API (`PDFParse`), not a callable default.
import { PDFParse } from 'pdf-parse';
import {
  type ExtractedResume,
  LLM_PORT,
  type LlmPort,
} from '@/bounded-contexts/ai/domain/ports/llm.port';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ConflictException } from '@/shared-kernel/exceptions/domain.exceptions';

export type PdfImportResult = {
  userId: string;
  resumeId: string;
  extracted: ExtractedResume;
};

/** Hard cap so a malicious upload can't blow up memory. 5MB fits virtually
 * every text-based CV; visually heavy PDFs get rejected. */
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class PdfImportService {
  private readonly logger = new Logger(PdfImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PORT) private readonly llm: LlmPort,
  ) {}

  async import(
    userId: string,
    file: { buffer: Buffer; originalname?: string },
  ): Promise<PdfImportResult> {
    if (!file?.buffer) {
      throw new ConflictException('PDF_BUFFER_REQUIRED');
    }
    if (file.buffer.byteLength > MAX_BYTES) {
      throw new ConflictException('PDF_TOO_LARGE');
    }

    const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
    const parsed = await parser.getText();
    const text = (parsed.text ?? '').trim();
    if (text.length < 100) {
      // Too short to be a real CV — usually means the PDF is image-based and
      // pdf-parse couldn't OCR it. Fail loudly so the UI prompts upload again.
      throw new ConflictException('PDF_NO_TEXT');
    }

    const extracted = await this.llm.extractResumeFromText(text);

    const resumeId = await this.persistResume(userId, extracted);

    this.logger.log(`PDF import for ${userId} → resume ${resumeId}`);
    return { userId, resumeId, extracted };
  }

  /**
   * Create a new Resume from the extracted fields. We intentionally keep the
   * persistence minimal — sections/items are the onboarding review step's
   * job. This stores just the top-level scalars so the user can open a draft.
   */
  private async persistResume(userId: string, extracted: ExtractedResume): Promise<string> {
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: extracted.fullName ? `${extracted.fullName}'s CV` : 'Imported CV',
        language: 'en',
        fullName: extracted.fullName,
        jobTitle: extracted.jobTitle,
        summary: extracted.summary,
        emailContact: extracted.email,
        phone: extracted.phone,
        location: extracted.location,
        linkedin: extracted.linkedin,
        github: extracted.github,
        primaryStack: extracted.skills.slice(0, 15),
      },
      select: { id: true },
    });

    // Mark as the user's primary if they don't have one yet — the rerender
    // and fit score flows consume `primaryResumeId`.
    await this.prisma.user.updateMany({
      where: { id: userId, primaryResumeId: null },
      data: { primaryResumeId: resume.id },
    });

    return resume.id;
  }
}
