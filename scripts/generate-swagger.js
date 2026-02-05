#!/usr/bin/env node
/**
 * Generate Swagger JSON without starting the server
 * Used for CI/CD and local development
 */

const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const fs = require('fs');
const path = require('path');

async function generate() {
  // Import AppModule
  const { AppModule } = require('./dist/app.module');

  // Create NestJS application in headless mode (no HTTP server)
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable logs
  });

  // Build Swagger config
  const config = new DocumentBuilder()
    .setTitle('ProFile API')
    .setDescription('The ProFile API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .build();

  // Generate Swagger document
  const document = SwaggerModule.createDocument(app, config);

  // Write to file
  const outputPath = path.join(__dirname, 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ Swagger JSON generated: ${outputPath}`);

  await app.close();
  process.exit(0);
}

generate().catch((err) => {
  console.error('❌ Failed to generate Swagger:', err);
  process.exit(1);
});
