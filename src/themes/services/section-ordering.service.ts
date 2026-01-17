/**
 * Section Ordering Service
 * Handles reordering of sections and items
 */

import { Injectable } from '@nestjs/common';
import { ResumeConfigRepository } from '../repositories';
import { moveItem, normalizeOrders } from '../utils';
import {
  ERROR_MESSAGES,
  DomainValidationError,
} from '@octopus-synapse/profile-contracts';

@Injectable()
export class SectionOrderingService {
  constructor(private repo: ResumeConfigRepository) {}

  async reorderSection(
    userId: string,
    resumeId: string,
    sectionId: string,
    newOrder: number,
  ) {
    const config = await this.repo.get(userId, resumeId);

    const idx = config.sections.findIndex((s) => s.id === sectionId);
    if (idx === -1)
      throw new DomainValidationError(ERROR_MESSAGES.SECTION_NOT_FOUND);

    config.sections = moveItem(config.sections, idx, newOrder);

    await this.repo.save(resumeId, config);
    return { success: true };
  }

  async reorderItem(
    userId: string,
    resumeId: string,
    sectionId: string,
    itemId: string,
    newOrder: number,
  ) {
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
    return { success: true };
  }

  async batchUpdate(
    userId: string,
    resumeId: string,
    updates: Array<{
      id: string;
      visible?: boolean;
      order?: number;
      column?: string;
    }>,
  ) {
    const config = await this.repo.get(userId, resumeId);

    config.sections = config.sections.map((section) => {
      const update = updates.find((u) => u.id === section.id);
      return update ? { ...section, ...update } : section;
    });

    config.sections = normalizeOrders(config.sections);

    await this.repo.save(resumeId, config);
    return { success: true };
  }
}
