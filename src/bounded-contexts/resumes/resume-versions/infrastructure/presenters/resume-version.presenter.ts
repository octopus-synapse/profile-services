interface VersionWithDate {
  createdAt: Date;
  [key: string]: unknown;
}

type VersionWithIsoDate<T extends VersionWithDate> = Omit<T, 'createdAt'> & { createdAt: string };

export function toVersionIsoList<T extends VersionWithDate>(
  versions: T[],
): VersionWithIsoDate<T>[] {
  const out: VersionWithIsoDate<T>[] = [];
  for (const v of versions) {
    out.push({ ...v, createdAt: v.createdAt.toISOString() } as VersionWithIsoDate<T>);
  }
  return out;
}
