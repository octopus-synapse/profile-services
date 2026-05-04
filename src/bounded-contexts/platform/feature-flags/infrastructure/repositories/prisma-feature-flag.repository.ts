import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  FeatureFlagRepositoryPort,
  type UpdateFlagInput,
  type UpsertFlagInput,
} from '../../domain/ports/feature-flag.repository.port';
import type { FeatureFlagKey, FlagRecord } from '../../domain/types';

type FlagRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  enabledForRoles: string[];
  deprecated: boolean;
  dependsOn: { dependency: { key: string } }[];
};

function toRecord(row: FlagRow): FlagRecord {
  return {
    key: row.key,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    enabledForRoles: row.enabledForRoles,
    deprecated: row.deprecated,
    dependsOn: row.dependsOn.map((d) => d.dependency.key),
  };
}

export class PrismaFeatureFlagRepository extends FeatureFlagRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listAll(): Promise<FlagRecord[]> {
    const rows = (await this.prisma.featureFlag.findMany({
      include: { dependsOn: { include: { dependency: { select: { key: true } } } } },
      orderBy: { key: 'asc' },
    })) as FlagRow[];
    return rows.map(toRecord);
  }

  async findByKey(key: FeatureFlagKey): Promise<FlagRecord | null> {
    const row = (await this.prisma.featureFlag.findUnique({
      where: { key },
      include: { dependsOn: { include: { dependency: { select: { key: true } } } } },
    })) as FlagRow | null;
    return row ? toRecord(row) : null;
  }

  async upsertFromRegistry(inputs: UpsertFlagInput[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const input of inputs) {
        await tx.featureFlag.upsert({
          where: { key: input.key },
          create: {
            key: input.key,
            name: input.name,
            description: input.description,
            enabled: input.defaultEnabled,
            deprecated: false,
          },
          update: { name: input.name, description: input.description, deprecated: false },
        });
      }

      const allKeys = inputs.map((i) => i.key);
      const saved = await tx.featureFlag.findMany({
        where: { key: { in: allKeys } },
        select: { id: true, key: true },
      });
      const idByKey = new Map(saved.map((s) => [s.key, s.id]));

      for (const input of inputs) {
        const dependentId = idByKey.get(input.key);
        if (!dependentId) continue;

        await tx.featureFlagDependency.deleteMany({ where: { dependentId } });

        if (input.dependsOn.length === 0) continue;

        const dependencyIds = input.dependsOn
          .map((k) => idByKey.get(k))
          .filter((id): id is string => !!id);

        if (dependencyIds.length > 0) {
          await tx.featureFlagDependency.createMany({
            data: dependencyIds.map((dependencyId) => ({ dependentId, dependencyId })),
          });
        }
      }
    });
  }

  async markDeprecated(keys: FeatureFlagKey[]): Promise<void> {
    if (keys.length === 0) return;
    await this.prisma.featureFlag.updateMany({
      where: { key: { in: keys } },
      data: { deprecated: true },
    });
  }

  async update(key: FeatureFlagKey, input: UpdateFlagInput): Promise<FlagRecord> {
    const row = (await this.prisma.featureFlag.update({
      where: { key },
      data: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.enabledForRoles !== undefined ? { enabledForRoles: input.enabledForRoles } : {}),
      },
      include: { dependsOn: { include: { dependency: { select: { key: true } } } } },
    })) as FlagRow;
    return toRecord(row);
  }
}
