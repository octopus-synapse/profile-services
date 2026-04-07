/**
 * Check Translation Health Use Case
 * Checks if the translation service is available
 */

import type { TranslationCoreService } from '../../../domain/services/translation-core.service';

export class CheckTranslationHealthUseCase {
  constructor(private readonly translationService: TranslationCoreService) {}

  async execute(): Promise<boolean> {
    return this.translationService.checkServiceHealth();
  }
}
