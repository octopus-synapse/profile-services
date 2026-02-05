/**
 * Generate Swagger JSON without starting the server
 *
 * Uses NestJS reflection to build OpenAPI spec from decorators.
 * Much faster than starting full server.
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

async function generateSwagger() {
  console.log('🔨 Creating NestJS application...');

  // Create app without listening
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable logging for faster startup
  });

  console.log('📝 Building Swagger configuration...');

  const config = new DocumentBuilder()
    .setTitle('ProFile API')
    .setDescription('ProFile Resume & Portfolio Management API')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('resumes', 'Resume CRUD operations')
    .addTag('resume-import', 'Resume import from JSON Resume format')
    .build();

  console.log('🔍 Scanning controllers and generating document...');

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  const outputPath = resolve(__dirname, '../swagger.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ Swagger JSON generated: ${outputPath}`);
  console.log(`📊 Endpoints found: ${Object.keys(document.paths).length}`);

  // Print some stats
  const tags = new Set<string>();
  Object.values(document.paths).forEach((methods: any) => {
    Object.values(methods).forEach((operation: any) => {
      operation.tags?.forEach((tag: string) => tags.add(tag));
    });
  });
  console.log(`🏷️  Tags: ${Array.from(tags).join(', ')}`);

  await app.close();
  process.exit(0);
}

generateSwagger().catch((error) => {
  console.error('❌ Failed to generate swagger:', error);
  process.exit(1);
});
