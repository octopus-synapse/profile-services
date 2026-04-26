/**
 * Presentation Module - ADR-002: Modular Hexagonal Architecture
 *
 * Submodules: Public Resumes. Resume styles now live at
 * `bounded-contexts/resume-styles` and are wired at the root AppModule.
 */

import { Module } from '@nestjs/common';
import { PublicResumesModule } from './public-resumes/public-resumes.module';

@Module({ imports: [PublicResumesModule], exports: [PublicResumesModule] })
export class PresentationModule {}
