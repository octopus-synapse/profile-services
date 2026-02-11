import { Module } from '@nestjs/common';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, S3UploadService],
  exports: [UploadService, S3UploadService],
})
export class UploadModule {}
