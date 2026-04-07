/**
 * Reorder Item Use Case
 */

import type { ResumeConfigRepositoryPort } from '../../domain/ports/resume-config.repository.port';

export class ReorderItemUseCase {
  constructor(private readonly repo: ResumeConfigRepositoryPort) {}

  async execute(
    userId: string,
    resumeId: string,
    sectionId: string,
    itemId: string,
    newOrder: number,
  ): Promise<void> {
    const config = await this.repo.get(userId, resumeId);

    const overrides = { ...config.itemOverrides };
    const items = overrides[sectionId] ?? [];

    const idx = items.findIndex((o) => o.itemId === itemId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], order: newOrder };
    } else {
      items.push({ itemId, visible: true, order: newOrder });
    }

    config.itemOverrides = { ...overrides, [sectionId]: items };

    await this.repo.save(resumeId, config);
  }
}
