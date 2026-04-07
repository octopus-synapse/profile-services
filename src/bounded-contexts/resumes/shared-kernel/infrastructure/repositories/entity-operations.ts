import type { PrismaDelegate } from './prisma-delegate.type';

export async function findEntityById<T>(
  delegate: PrismaDelegate<T>,
  entityId: string,
  resumeId: string,
): Promise<T | null> {
  return delegate.findFirst({ where: { id: entityId, resumeId } });
}

export async function deleteEntity<T>(
  delegate: PrismaDelegate<T>,
  entityId: string,
  resumeId: string,
): Promise<boolean> {
  const result = await delegate.deleteMany({
    where: { id: entityId, resumeId },
  });
  return result.count > 0;
}

export async function updateEntity<T>(
  delegate: PrismaDelegate<T>,
  entityId: string,
  resumeId: string,
  data: Record<string, unknown>,
): Promise<T | null> {
  const result = await delegate.updateMany({
    where: { id: entityId, resumeId },
    data,
  });
  if (result.count === 0) return null;
  return delegate.findUnique({ where: { id: entityId } });
}

export async function createEntity<T>(
  delegate: PrismaDelegate<T>,
  data: Record<string, unknown>,
): Promise<T> {
  return delegate.create({ data });
}
