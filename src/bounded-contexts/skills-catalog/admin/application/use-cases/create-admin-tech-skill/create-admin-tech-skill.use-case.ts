import {
  SkillAlreadyExistsException,
  SkillSlugTakenException,
} from '../../../../domain/exceptions/skills-catalog.exceptions';
import { AdminTechSkillsRepositoryPort } from '../../../domain/ports/admin-tech-skills.repository.port';

export class CreateAdminTechSkillUseCase {
  constructor(private readonly repository: AdminTechSkillsRepositoryPort) {}

  async execute(input: Record<string, unknown>) {
    // Pre-check duplicates so the API surfaces a clean 409 with the
    // human-readable code instead of a Prisma P2002 unique-constraint
    // error bubbling up to the global filter.
    const slug = typeof input.slug === 'string' ? input.slug : null;
    if (slug) {
      const slugClash = await this.repository.findBySlug(slug);
      if (slugClash) throw new SkillSlugTakenException(slug);
    }

    const nameEn = typeof input.nameEn === 'string' ? input.nameEn : null;
    if (nameEn) {
      const nameClash = await this.repository.findByNameEn(nameEn);
      if (nameClash) throw new SkillAlreadyExistsException(nameEn);
    }

    return this.repository.create(input);
  }
}
