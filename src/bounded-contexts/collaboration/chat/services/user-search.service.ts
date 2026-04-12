import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class ChatUserSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, currentUserId: string, limit = 10) {
    if (!query || query.length < 2) return [];

    return this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { isActive: true },
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        photoURL: true,
      },
      take: limit,
      orderBy: { username: 'asc' },
    });
  }
}
