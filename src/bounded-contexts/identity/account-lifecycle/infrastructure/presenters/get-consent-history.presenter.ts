import type {
  ConsentHistoryResponseDto,
  GetConsentHistoryOutput,
} from '../../application/use-cases/get-consent-history/get-consent-history.dto';

export function toConsentHistoryResponse(
  records: GetConsentHistoryOutput,
): ConsentHistoryResponseDto[] {
  const out: ConsentHistoryResponseDto[] = [];
  for (const r of records) {
    out.push({
      id: r.id,
      documentType: r.documentType,
      version: r.version,
      acceptedAt: r.acceptedAt.toISOString(),
      ipAddress: r.ipAddress ?? '',
      userAgent: r.userAgent ?? '',
    });
  }
  return out;
}
