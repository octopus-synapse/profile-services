import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Type-safe model accessor for cleanup operations
type DeletableModel = { deleteMany: () => Promise<unknown> };
type PrismaModelKey = keyof Omit<
  PrismaClient,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$extends'
  | '$executeRaw'
  | '$executeRawUnsafe'
  | '$queryRaw'
  | '$queryRawUnsafe'
>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production!');
    }

    // Delete in reverse order of dependencies to avoid FK constraint errors
    const modelNames = [
      'achievement',
      'openSourceContribution',
      'bugBounty',
      'hackathon',
      'talk',
      'publication',
      'recommendation',
      'interest',
      'language',
      'award',
      'certification',
      'project',
      'skill',
      'education',
      'experience',
      'userPreferences',
      'resume',
      'user',
    ] as const;

    for (const modelName of modelNames) {
      try {
        const model = this[modelName as PrismaModelKey] as
          | DeletableModel
          | undefined;
        if (model) {
          await model.deleteMany();
        }
      } catch {
        // Model may not exist, skip
      }
    }
  }
}
