/**
 * Skills Catalog Module - ADR-002: Modular Hexagonal Architecture
 *
 * Submodules: Skills, Tech Skills, Spoken Languages
 */

import { Module } from '@nestjs/common';
import { SkillsModule } from './skills/skills.module';
import { SpokenLanguagesModule } from './spoken-languages/spoken-languages.module';
import { TechSkillsModule } from './tech-skills/tech-skills.module';

@Module({
  imports: [SkillsModule, TechSkillsModule, SpokenLanguagesModule],
  exports: [SkillsModule, TechSkillsModule, SpokenLanguagesModule],
})
export class SkillsCatalogModule {}
