import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { TrackEventsBodyDto } from './dto/track-event.dto';

@Injectable()
export class PlatformEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(userId: string | null, body: TrackEventsBodyDto): Promise<{ accepted: number }> {
    const rows = body.events.map((e) => ({
      userId,
      event: e.event,
      props: (e.props ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      occurredAt: new Date(e.occurredAt),
    }));

    const result = await this.prisma.platformEvent.createMany({ data: rows });
    return { accepted: result.count };
  }
}
