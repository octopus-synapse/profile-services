#!/usr/bin/env bun
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

NestFactory.create(AppModule, { abortOnError: false })
  .then(async (app) => {
    console.log('BOOTED OK');
    await app.close();
  })
  .catch((e) => {
    console.error('BOOT FAILED');
    console.error(e);
    process.exit(1);
  });
