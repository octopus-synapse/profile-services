/**
 * Social Module - ADR-002: Modular Hexagonal Architecture
 *
 * Submodules: Social (activity feed, follows)
 */

import { Module } from '@nestjs/common';
import { SocialModule as SocialFeaturesModule } from './social/social.module';

@Module({
  imports: [SocialFeaturesModule],
  exports: [SocialFeaturesModule],
})
export class SocialModule {}
