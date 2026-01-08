import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { ResumeResolver } from './resolvers/resume.resolver';
import { DataLoaderService } from './dataloaders/dataloader.service';
import { ResumesModule } from '../resumes/resumes.module';
import { PrismaModule } from '../prisma/prisma.module';

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
          context: ({ req }) => ({
            req,
            loaders: new DataLoaderService(req.prisma),
          }),

          // Format errors for better debugging (hide in production)
          formatError: (error) => {
            if (isProduction) {
              // Don't leak internal errors in production
              return {
                message: error.message,
                code: error.extensions?.code,
              };
            }
            return error;
          },

          // CORS configuration
          cors: {
            origin:
              configService.get('FRONTEND_URL') || 'http://localhost:3000',
            credentials: true,
          },
        };
      },
    }),
    PrismaModule,
    ResumesModule,
  ],
  providers: [ResumeResolver, DataLoaderService],
  exports: [DataLoaderService],
})
export class GraphqlModule {}
