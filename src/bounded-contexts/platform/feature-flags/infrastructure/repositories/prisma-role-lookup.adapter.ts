/**
 * Prisma-backed `RoleLookupPort` adapter. Returns active role names
 * for a user — drops expired role assignments at the SQL boundary so
 * call sites get a clean snapshot.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { RoleLookupPort } from '../../application/ports/role-lookup.port';

export class PrismaRoleLookupAdapter implements RoleLookupPort {
  constructor(private readonly prisma: PrismaService) {}

  async rolesFor(userId: string): Promise<string[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { role: { select: { name: true } } },
    });
    return assignments.map((a) => a.role.name);
  }
}
