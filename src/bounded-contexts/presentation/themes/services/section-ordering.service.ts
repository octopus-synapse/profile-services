/**
 * Section Ordering Service
 * Handles reordering of sections and items
 */

import { Injectable } from '@nestjs/common';
import { ResumeConfigRepository } from './resume-config.repository';

@Injectable()
export class SectionOrderingService {
  constructor(private repo: ResumeConfigRepository) {}

  /**
   * Reorder a section
   * @returns void (not envelope)
   */
  async reorderSection(
    userId: string,
    resumeId: string,
    sectionId: string,
    newOrder: number,
  ): Promise<void> {
    // Verify user owns the resume
    await this.repo.get(userId, resumeId);

    // Directly update ResumeSection order (bypasses theme config)
    await this.repo.reorderSectionDirect(resumeId, sectionId, newOrder);
  }

  /**
   * Reorder an item
   * @returns void (not envelope)
   */
  async reorderItem(
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

  /**
   * Batch update sections
   * @returns void (not envelope)
   */
  async batchUpdate(
    userId: string,
    resumeId: string,
    updates: Array<{
      id: string;
      visible?: boolean;
      order?: number;
      column?: string;
    }>,
  ): Promise<void> {
    // Verify user owns the resume
    await this.repo.get(userId, resumeId);

    // Directly update ResumeSection orders (bypasses theme config)
    await this.repo.batchUpdateSectionsDirect(resumeId, updates);
  }
}
