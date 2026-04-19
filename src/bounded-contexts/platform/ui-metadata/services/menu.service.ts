import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { buildMenu, type MenuNode } from './menu-builder';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pull direct UserPermission grants (granted=true, not expired) for the
   * viewer and hand them to buildMenu. Roles/groups would deserve a join
   * too — keeping it minimal until the tree starts gating more entries.
   */
  async getMenuFor(userId: string): Promise<MenuNode[]> {
    const grants = await this.prisma.userPermission.findMany({
      where: {
        userId,
        granted: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { permission: { select: { resource: true, action: true } } },
    });

    const out: string[] = [];
    for (const g of grants) {
      if (g.permission) out.push(`${g.permission.resource}:${g.permission.action}`);
    }
    return buildMenu(out);
  }
}
