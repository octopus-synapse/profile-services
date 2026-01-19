/**
 * Certifications Section Mapper
 *
 * Maps resume certification entries to AST certification section data.
 */

import type {
  SectionData,
  CertificationItem,
} from '@octopus-synapse/profile-contracts';
import type { ResumeWithRelations } from '../dsl-compiler.service';
import {
  type SectionMapper,
  type ItemOverride,
  applyItemOverrides,
} from './section-mapper.interface';

export class CertificationsSectionMapper implements SectionMapper {
  readonly sectionId = 'certifications';

  map(
    resume: ResumeWithRelations,
    overrides: ItemOverride[],
  ): SectionData | undefined {
    const items = applyItemOverrides(resume.certifications, overrides).map(
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

  getPlaceholder(): SectionData {
    return { type: 'certifications', items: [] };
  }
}
