import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { SkillInUseException } from '../../../../domain/exceptions/skills-catalog.exceptions';
import { AdminTechSkillsRepositoryPort } from '../../../domain/ports/admin-tech-skills.repository.port';

export class DeleteAdminTechSkillUseCase {
  constructor(private readonly repository: AdminTechSkillsRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findOne(id);
    if (!existing) throw new EntityNotFoundException('TechSkill', id);

    // Block deletion when the catalog entry is still cited by resume
    // section items. The check is best-effort (string match in JSON
    // content) and is sufficient to avoid silently breaking user
    // resumes that reference the skill by name.
    const refs = await this.repository.countResumeReferences({
      slug: existing.slug,
      nameEn: existing.nameEn,
      namePtBr: existing.namePtBr,
    });
    if (refs > 0) throw new SkillInUseException();

    await this.repository.delete(id);
  }
}
