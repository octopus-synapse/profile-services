/**
 * Presentation Module - ADR-002: Modular Hexagonal Architecture
 *
 * Submodules: Themes, Public Resumes
 */

import { Module } from '@nestjs/common';
import { PublicResumesModule } from './public-resumes/public-resumes.module';
import { ThemesModule } from './themes/themes.module';

@Module({
  imports: [ThemesModule, PublicResumesModule],
  exports: [ThemesModule, PublicResumesModule],
})
export class PresentationModule {}
