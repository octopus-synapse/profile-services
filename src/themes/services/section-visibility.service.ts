/**
 * Section Visibility Service
 * Handles showing/hiding sections and items
 */

import { Injectable } from '@nestjs/common';
import {
  ResumeConfigRepository,
  ResumeConfig,
} from './resume-config.repository';

@Injectable()
export class SectionVisibilityService {
  constructor(private repo: ResumeConfigRepository) {}

  async toggleSection(
    userId: string,
    resumeId: string,
    sectionId: string,
    visible: boolean,
  ) {
    const config = await this.repo.get(userId, resumeId);

    config.sections = config.sections.map((s) =>
      s.id === sectionId ? { ...s, visible } : s,
    );

    await this.repo.save(resumeId, config);
    return { success: true };
  }

  async toggleItem(
    userId: string,
    resumeId: string,
    sectionId: string,
    itemId: string,
    visible: boolean,
  ) {
    const config = await this.repo.get(userId, resumeId);
    config.itemOverrides = this.updateOverride(config, sectionId, itemId, {
      visible,
    });

    await this.repo.save(resumeId, config);
    return { success: true };
  }

  private updateOverride(
    config: ResumeConfig,
    sectionId: string,
    itemId: string,
    update: { visible?: boolean; order?: number },
  ) {
    const overrides = { ...config.itemOverrides };
    const items = overrides[sectionId] || [];

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
