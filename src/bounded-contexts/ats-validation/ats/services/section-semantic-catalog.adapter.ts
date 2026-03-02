import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  SectionDefinition,
  SectionFieldDefinition,
  SectionKind,
  SemanticFieldValue,
  SemanticRole,
} from '@/shared-kernel/dtos/semantic-sections.dto';
import {
  SectionDefinitionSchema,
  SectionKindSchema,
} from '@/shared-kernel/dtos/semantic-sections.dto';
import type { SectionSemanticCatalogPort, SemanticResumeSnapshot } from '../interfaces';

@Injectable()
export class SectionSemanticCatalogAdapter implements SectionSemanticCatalogPort {
  constructor(private readonly prisma: PrismaService) {}

  async getSemanticResumeSnapshot(resumeId: string): Promise<SemanticResumeSnapshot> {
    const resumeSections = await this.prisma.resumeSection.findMany({
      where: { resumeId },
      include: {
        sectionType: true,
        items: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    const items = resumeSections.flatMap((resumeSection) => {
      const definition = this.parseDefinition(resumeSection.sectionType.definition);

      return resumeSection.items.map((item) => {
        const content = this.asRecord(item.content);
        const semanticValues = this.extractValues(definition.fields, content);

        const sectionKind = this.normalizeSectionKind(resumeSection.sectionType.semanticKind);

        return {
          sectionTypeKey: resumeSection.sectionType.key,
          sectionTypeVersion: resumeSection.sectionType.version,
          sectionKind,
          values: semanticValues,
        };
      });
    });

    return {
      resumeId,
      items,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private normalizeSectionKind(kind: string): SectionKind {
    const parsed = SectionKindSchema.safeParse(kind);
    if (!parsed.success) {
      return 'CUSTOM';
    }

    return parsed.data;
  }

  private parseDefinition(rawDefinition: unknown): SectionDefinition {
    const parsed = SectionDefinitionSchema.safeParse(rawDefinition);

    if (!parsed.success) {
      return {
        schemaVersion: 1,
        kind: 'CUSTOM',
        fields: [],
      };
    }

    return parsed.data;
  }

  private extractValues(
    fieldDefinitions: SectionFieldDefinition[],
    content: Record<string, unknown>,
  ): SemanticFieldValue[] {
    const values: SemanticFieldValue[] = [];

    for (const field of fieldDefinitions) {
      if (!field.key) {
        continue;
      }

      const fieldValue = content[field.key];
      if (fieldValue === undefined || fieldValue === null) {
        continue;
      }

      values.push(...this.extractValuesFromField(field, fieldValue));
    }

    return values;
  }

  private extractValuesFromField(
    field: SectionFieldDefinition,
    value: unknown,
  ): SemanticFieldValue[] {
    const values: SemanticFieldValue[] = [];

    if (field.semanticRole) {
      values.push({
        role: field.semanticRole as SemanticRole,
        value,
      });
    }

    if (field.type === 'object' && field.fields) {
      const nestedRecord = this.asRecord(value);
      for (const nestedField of field.fields) {
        if (!nestedField.key) {
          continue;
        }

        const nestedValue = nestedRecord[nestedField.key];
        if (nestedValue === undefined || nestedValue === null) {
          continue;
        }

        values.push(...this.extractValuesFromField(nestedField, nestedValue));
      }
    }

    if (field.type === 'array' && field.items && Array.isArray(value)) {
      for (const arrayItem of value) {
        values.push(...this.extractValuesFromField(field.items, arrayItem));
      }
    }

    return values;
  }
}
