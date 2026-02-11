import type { Award, Certification, Interest, Recommendation } from '@prisma/client';
import {
  type AwardItem,
  applyOverrides,
  type CertificationItem,
  type InterestItem,
  type ItemOverride,
  type ReferenceItem,
  type SectionData,
} from './shared';

export function compileCertifications(
  certifications: Certification[],
  overrides: ItemOverride[],
): SectionData {
  const items = applyOverrides(certifications, overrides).map(
    (cert): CertificationItem => ({
      id: cert.id,
      name: cert.name,
      issuer: cert.issuer,
      date: cert.issueDate.toISOString(),
      url: cert.credentialUrl ?? undefined,
    }),
  );
  return { type: 'certifications', items };
}

export function compileAwards(awards: Award[], overrides: ItemOverride[]): SectionData {
  const items = applyOverrides(awards, overrides).map(
    (award): AwardItem => ({
      id: award.id,
      title: award.title,
      issuer: award.issuer,
      date: award.date.toISOString(),
      description: award.description ?? undefined,
    }),
  );
  return { type: 'awards', items };
}

export function compileInterests(interests: Interest[], overrides: ItemOverride[]): SectionData {
  const items = applyOverrides(interests, overrides).map(
    (int): InterestItem => ({
      id: int.id,
      name: int.name,
      keywords: int.description ? [int.description] : [],
    }),
  );
  return { type: 'interests', items };
}

export function compileReferences(
  recommendations: Recommendation[],
  overrides: ItemOverride[],
): SectionData {
  const items = applyOverrides(recommendations, overrides).map(
    (rec): ReferenceItem => ({
      id: rec.id,
      name: rec.author,
      role: rec.position ?? '',
      company: rec.company ?? undefined,
    }),
  );
  return { type: 'references', items };
}
