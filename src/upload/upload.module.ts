import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { S3UploadService } from '../common/services/s3-upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, S3UploadService],
  exports: [UploadService],
})
export class UploadModule {}
