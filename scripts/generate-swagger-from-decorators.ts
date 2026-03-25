#!/usr/bin/env bun
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { createSwaggerDocument } from '../src/bounded-contexts/platform/common/config/swagger.config';

const SWAGGER_PATH = resolve(__dirname, '../swagger.json');
const REPORT_PATH = resolve(__dirname, '../swagger-generation-report.json');

type SwaggerReport = {
  success: boolean;
  generatedBy: 'nest-swagger';
  paths: number;
  operations: number;
  schemas: number;
  tags: string[];
};

function countOperations(document: OpenAPIObject): number {
  return Object.values(document.paths).reduce((total, pathItem) => {
    return total + Object.keys(pathItem ?? {}).length;
  }, 0);
}

function createReport(document: OpenAPIObject): SwaggerReport {
  return {
    success: true,
    generatedBy: 'nest-swagger',
    paths: Object.keys(document.paths).length,
    operations: countOperations(document),
    schemas: Object.keys(document.components?.schemas ?? {}).length,
    tags: (document.tags ?? []).map((tag) => tag.name).sort(),
  };
}

async function generateSwagger(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    abortOnError: true,
    logger: false,
  });

  try {
    app.setGlobalPrefix('api');

    const document = createSwaggerDocument(app);
    const report = createReport(document);

    writeFileSync(SWAGGER_PATH, `${JSON.stringify(document, null, 2)}\n`);
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`✅ Swagger JSON generated: ${SWAGGER_PATH}`);
    console.log(`📊 Paths: ${report.paths}`);
    console.log(`📊 Operations: ${report.operations}`);
    console.log(`📊 Schemas: ${report.schemas}`);
  } finally {
    await app.close();
  }
}

generateSwagger().catch((error: unknown) => {
  console.error('❌ Failed to generate swagger.json');
  console.error(error);
  process.exitCode = 1;
});
