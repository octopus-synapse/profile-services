import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../logger/logger.module';
import { EmailService } from './email.service';
import { EmailSenderService, EmailTemplateService } from './services';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [EmailService, EmailSenderService, EmailTemplateService],
  exports: [EmailService],
})
export class EmailModule {}
