import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';

@Injectable()
export class StorageHealthIndicator extends HealthIndicator {
  constructor(private readonly s3Service: S3UploadService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isEnabled = this.s3Service.isEnabled;

    if (!isEnabled) {
      return this.getStatus(key, true, {
        message: 'S3/MinIO not configured (graceful degradation)',
        configured: false,
      });
    }

    try {
      // Check if we can list objects (basic connectivity test)
      const canConnect = await this.s3Service.checkConnection();

      if (canConnect) {
        return this.getStatus(key, true, {
          message: 'S3/MinIO is connected',
          configured: true,
        });
      }

      throw new Error('S3/MinIO connection failed');
    } catch (error) {
      throw new HealthCheckError(
        'Storage check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
          configured: true,
        }),
      );
    }
  }
}
