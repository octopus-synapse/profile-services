import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ResumesModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
import { PrismaService } from '../prisma/prisma.service';
import { DataLoaderService } from './dataloaders/dataloader.service';
import { ResumeResolver } from './resolvers/resume.resolver';

/**
 * GraphQL Module
 *
 * Configures Apollo Server with Code-First approach.
 *
 * Features:
 * - Code-First schema generation (Issue #76)
 * - DataLoader integration (Issue #77)
 * - GraphQL Playground (Issue #78)
 * - JWT authentication
 * - Introspection control
 *
 * @see https://docs.nestjs.com/graphql/quick-start
 */
@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';

        return {
          // Code-First approach
          autoSchemaFile: join(process.cwd(), 'src/graphql/schema.graphql'),
          sortSchema: true,

          // GraphQL Playground configuration (Issue #78)
          playground: !isProduction, // Disable in production for security
          introspection: !isProduction, // Disable introspection in production

          // Context setup for DataLoader and authentication
          context: ({ req }: { req: Express.Request & { prisma: PrismaService } }) => {
            const loaders = new DataLoaderService(req.prisma);
            return {
              req,
              loaders,
            };
          },
          /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */

          // Format errors for better debugging (hide in production)
          formatError: (error: GraphQLError) => {
            if (isProduction) {
              // Don't leak internal errors in production
              return {
                message: error.message,
                code: error.extensions.code,
              };
            }
            return error;
          },

          // CORS configuration
          cors: {
            origin: configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000',
            credentials: true,
          },
        };
      },
    }),
    PrismaModule,
    ResumesModule,
    ResumeAnalyticsModule,
  ],
  providers: [ResumeResolver, DataLoaderService],
  exports: [DataLoaderService],
})
export class GraphqlModule {}
