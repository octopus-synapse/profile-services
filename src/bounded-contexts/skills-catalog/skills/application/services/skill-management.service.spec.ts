import { describe, expect, it } from 'bun:test';
import { InMemorySkillManagementRepository } from '../../testing';
import { AddSkillUseCase } from '../use-cases/add-skill/add-skill.use-case';
import { DeleteSkillUseCase } from '../use-cases/delete-skill/delete-skill.use-case';
import { ListSkillsUseCase } from '../use-cases/list-skills/list-skills.use-case';
import { ListSkillsForResumeUseCase } from '../use-cases/list-skills-for-resume/list-skills-for-resume.use-case';
import { UpdateSkillUseCase } from '../use-cases/update-skill/update-skill.use-case';
import { SkillManagementService } from './skill-management.service';

describe('SkillManagementService', () => {
  function build() {
    const repo = new InMemorySkillManagementRepository();
    return {
      repo,
      service: new SkillManagementService(
        new ListSkillsUseCase(repo),
        new ListSkillsForResumeUseCase(repo),
        new AddSkillUseCase(repo),
        new UpdateSkillUseCase(repo),
        new DeleteSkillUseCase(repo),
      ),
    };
  }

  it('round-trips a skill: add → list → update → delete', async () => {
    const { repo, service } = build();
    repo.seedResume('r-1');

    const created = await service.addSkillToResume('r-1', { name: 'TS', category: 'Language' });
    expect(created.name).toBe('TS');

    const listed = await service.listSkillsForResume('r-1');
    expect(listed).toHaveLength(1);

    const updated = await service.updateSkill(created.id, { level: 4 });
    expect(updated.level).toBe(4);

    await service.deleteSkill(created.id);
    expect(await service.listSkillsForResume('r-1')).toEqual([]);
  });

  it('legacy listSkills() returns empty list (no global catalog yet)', () => {
    const { service } = build();
    expect(service.listSkills()).toEqual([]);
  });
});
