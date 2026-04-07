/**
 * Toggle Item Visibility Use Case
 */

import type {
  ResumeConfig,
  ResumeConfigRepositoryPort,
} from '../../domain/ports/resume-config.repository.port';

export class ToggleItemVisibilityUseCase {
  constructor(private readonly repo: ResumeConfigRepositoryPort) {}

  async execute(
    userId: string,
    resumeId: string,
    sectionId: string,
    itemId: string,
    visible: boolean,
  ): Promise<void> {
    const config = await this.repo.get(userId, resumeId);
    config.itemOverrides = this.updateOverride(config, sectionId, itemId, { visible });

    await this.repo.save(resumeId, config);
  }

  private updateOverride(
    config: ResumeConfig,
    sectionId: string,
    itemId: string,
    update: { visible?: boolean; order?: number },
  ) {
    const overrides = { ...config.itemOverrides };
    const items = overrides[sectionId] ?? [];

    const idx = items.findIndex((o) => o.itemId === itemId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...update };
    } else {
      items.push({
        itemId,
        visible: update.visible ?? true,
        order: update.order ?? 999,
      });
    }

    return { ...overrides, [sectionId]: items };
  }
}
