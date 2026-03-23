import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SectionDefinitionSchema } from '@/shared-kernel/dtos/semantic-sections.dto';
import type {
  SectionTypeRecord,
  SectionTypeWithDefinition,
} from '@/shared-kernel/types/generic-section.types';

/**
 * Repository for SectionType entities.
 *
 * This is the single point of access for section type definitions.
 * All section-specific knowledge comes from these definitions, not hardcoded logic.
 *
 * Features:
 * - Fetches and caches all active section types on module init
 * - Parses definition JSON into typed SectionDefinition
 * - Provides lookups by key, kind, slug
 * - Validates definitions on load
 */
@Injectable()
export class SectionTypeRepository implements OnModuleInit {
  private readonly logger = new Logger(SectionTypeRepository.name);

  // In-memory cache of active section types with parsed definitions
  private sectionTypesCache: Map<string, SectionTypeWithDefinition> = new Map();

  // Index by semanticKind for quick lookup
  private byKindIndex: Map<string, SectionTypeWithDefinition> = new Map();

  // Index by slug for API lookups
  private bySlugIndex: Map<string, SectionTypeWithDefinition> = new Map();

  private initialized = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.loadAllActive();
  }

  /**
   * Load all active section types from database.
   * Call this on startup and after any definition updates.
   */
  async loadAllActive(): Promise<void> {
    const records = await this.prisma.sectionType.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    });

    this.sectionTypesCache.clear();
    this.byKindIndex.clear();
    this.bySlugIndex.clear();

    for (const record of records) {
      const parsed = this.parseRecord(record as SectionTypeRecord);
      if (parsed) {
        this.sectionTypesCache.set(parsed.key, parsed);
        this.byKindIndex.set(parsed.semanticKind, parsed);
        this.bySlugIndex.set(parsed.slug, parsed);
      }
    }

    this.initialized = true;
  }

  /**
   * Get section type by key.
   */
  getByKey(key: string): SectionTypeWithDefinition | undefined {
    this.ensureInitialized();
    return this.sectionTypesCache.get(key);
  }

  /**
   * Get section type by semantic kind.
   */
  getByKind(kind: string): SectionTypeWithDefinition | undefined {
    this.ensureInitialized();
    return this.byKindIndex.get(kind);
  }

  /**
   * Get section type by slug.
   */
  getBySlug(slug: string): SectionTypeWithDefinition | undefined {
    this.ensureInitialized();
    return this.bySlugIndex.get(slug);
  }

  /**
   * Get all active section types.
   */
  getAll(): SectionTypeWithDefinition[] {
    this.ensureInitialized();
    return Array.from(this.sectionTypesCache.values());
  }

  /**
   * Get section types filtered by repeatability.
   */
  getRepeatable(): SectionTypeWithDefinition[] {
    return this.getAll().filter((st) => st.isRepeatable);
  }

  /**
   * Get section types marked as mandatory for ATS.
   */
  getMandatoryForAts(): SectionTypeWithDefinition[] {
    return this.getAll().filter((st) => st.definition.ats?.isMandatory === true);
  }

  /**
   * Get section types sorted by ATS recommended position.
   */
  getSortedByAtsPosition(): SectionTypeWithDefinition[] {
    return this.getAll().sort((a, b) => {
      const posA = a.definition.ats?.recommendedPosition ?? 99;
      const posB = b.definition.ats?.recommendedPosition ?? 99;
      return posA - posB;
    });
  }

  /**
   * Find section type by ATS section detection keywords.
   * Useful for auto-detecting sections from imported resumes.
   */
  findByAtsKeyword(keyword: string): SectionTypeWithDefinition | undefined {
    const lowerKeyword = keyword.toLowerCase();

    for (const st of this.getAll()) {
      const detection = st.definition.ats?.sectionDetection;
      if (!detection) continue;

      // Check single keywords
      if (detection.keywords?.some((k) => k.toLowerCase() === lowerKeyword)) {
        return st;
      }

      // Check multi-word phrases
      if (detection.multiWord?.some((phrase) => phrase.toLowerCase() === lowerKeyword)) {
        return st;
      }
    }

    return undefined;
  }

  /**
   * Find section type that best matches a given section title.
   * Uses fuzzy matching against ATS keywords.
   */
  findByTitle(title: string): SectionTypeWithDefinition | undefined {
    const lowerTitle = title.toLowerCase();

    // Exact match on slug
    const bySlug = this.bySlugIndex.get(lowerTitle.replace(/\s+/g, '-'));
    if (bySlug) return bySlug;

    // Check each section type's detection keywords
    for (const st of this.getAll()) {
      const detection = st.definition.ats?.sectionDetection;
      if (!detection) continue;

      // Check if title contains any keyword
      if (detection.keywords?.some((k) => lowerTitle.includes(k.toLowerCase()))) {
        return st;
      }

      // Check multi-word phrases
      if (detection.multiWord?.some((phrase) => lowerTitle.includes(phrase.toLowerCase()))) {
        return st;
      }
    }

    return undefined;
  }

  /**
   * Check if the cache is initialized and ready.
   */
  isReady(): boolean {
    return this.initialized && this.sectionTypesCache.size > 0;
  }

  /**
   * Refresh cache from database.
   * Call after updating section type definitions.
   */
  async refresh(): Promise<void> {
    await this.loadAllActive();
  }

  /**
   * Parse a raw database record into a typed SectionTypeWithDefinition.
   */
  private parseRecord(record: SectionTypeRecord): SectionTypeWithDefinition | null {
    const parsed = SectionDefinitionSchema.safeParse(record.definition);
    if (!parsed.success) {
      this.logger.warn(`Failed to parse definition for ${record.key}: ${parsed.error.message}`);
      return null;
    }

    return {
      id: record.id,
      key: record.key,
      slug: record.slug,
      title: record.title,
      description: record.description,
      semanticKind: record.semanticKind,
      version: record.version,
      isRepeatable: record.isRepeatable,
      minItems: record.minItems,
      maxItems: record.maxItems,
      definition: parsed.data,
      uiSchema: record.uiSchema,
      isActive: record.isActive,
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SectionTypeRepository not initialized. Ensure onModuleInit was called.');
    }
  }
}
