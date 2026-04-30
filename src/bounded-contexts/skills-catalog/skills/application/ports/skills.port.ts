/**
 * Bundle token for the skills BC. Doubles as the TypeScript shape of
 * the use-case bag and the Nest DI token. Composition lives in
 * `skills.composition.ts` — Nest-free.
 */

import type { AddSkillUseCase } from '../use-cases/add-skill/add-skill.use-case';
import type { DeleteSkillUseCase } from '../use-cases/delete-skill/delete-skill.use-case';
import type { ListSkillsUseCase } from '../use-cases/list-skills/list-skills.use-case';
import type { ListSkillsForResumeUseCase } from '../use-cases/list-skills-for-resume/list-skills-for-resume.use-case';
import type { UpdateSkillUseCase } from '../use-cases/update-skill/update-skill.use-case';

export abstract class SkillsUseCases {
  abstract readonly listSkills: ListSkillsUseCase;
  abstract readonly listSkillsForResume: ListSkillsForResumeUseCase;
  abstract readonly addSkill: AddSkillUseCase;
  abstract readonly updateSkill: UpdateSkillUseCase;
  abstract readonly deleteSkill: DeleteSkillUseCase;
}
