import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { PrismaDelegate } from './prisma-delegate.type';

type AggregateResult = { _max: { order: number | null } };

export async function getMaxOrder<T>(
  delegate: PrismaDelegate<T>,
  resumeId: string,
  additionalScope: Record<string, unknown> = {},
): Promise<number> {
  const result = (await delegate.aggregate({
    where: { resumeId, ...additionalScope },
    _max: { order: true },
  })) as AggregateResult;

  return result._max.order ?? -1;
}

export async function reorderEntities<T>(
  prisma: PrismaService,
  delegate: PrismaDelegate<T>,
  entityIds: string[],
): Promise<void> {
  await prisma.$transaction(async () => {
    for (let index = 0; index < entityIds.length; index++) {
      await delegate.update({
        where: { id: entityIds[index] },
        data: { order: index },
      });
    }
  });
}
