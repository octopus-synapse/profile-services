/**
 * User Data Adapter
 *
 * Implements UserDataPort by delegating to PrismaService.
 * Keeps the export BC isolated from identity BC.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type ExportUserData, UserDataPort } from '../../../domain/ports/user-data.port';

@Injectable()
export class UserDataAdapter extends UserDataPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(userId: string): Promise<ExportUserData | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        website: true,
        linkedin: true,
        github: true,
        photoURL: true,
      },
    });
  }
}
