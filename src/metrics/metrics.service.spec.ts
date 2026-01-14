import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('Counter Metrics', () => {
    describe('resume_created_total', () => {
      it('should increment resume created counter', async () => {
        service.incrementResumeCreated();
        const value = await service.getMetricValue('resume_created_total');
        expect(value).toBe(1);
      });

      it('should increment with labels', async () => {
        service.incrementResumeCreated({ templateId: 'classic' });
        const value = await service.getMetricValue('resume_created_total', {
          templateId: 'classic',
        });
        expect(value).toBe(1);
      });
    });

    describe('user_signup_total', () => {
      it('should increment user signup counter', async () => {
        service.incrementUserSignup();
        const value = await service.getMetricValue('user_signup_total');
        expect(value).toBe(1);
      });

      it('should track signup method', async () => {
        service.incrementUserSignup({ method: 'google' });
        const value = await service.getMetricValue('user_signup_total', {
          method: 'google',
        });
        expect(value).toBe(1);
      });
    });

    describe('export_completed_total', () => {
      it('should increment export completed counter', async () => {
        service.incrementExportCompleted({ format: 'pdf' });
        const value = await service.getMetricValue('export_completed_total', {
          format: 'pdf',
        });
        expect(value).toBe(1);
      });

      it('should track different formats separately', async () => {
        service.incrementExportCompleted({ format: 'pdf' });
        service.incrementExportCompleted({ format: 'docx' });
        service.incrementExportCompleted({ format: 'pdf' });

        const pdfValue = await service.getMetricValue(
          'export_completed_total',
          {
            format: 'pdf',
          },
        );
        const docxValue = await service.getMetricValue(
          'export_completed_total',
          { format: 'docx' },
        );

        expect(pdfValue).toBe(2);
        expect(docxValue).toBe(1);
      });
    });
  });

  describe('Histogram Metrics', () => {
    describe('export_duration_seconds', () => {
      it('should observe export duration', () => {
        service.observeExportDuration(1.5, { format: 'pdf' });

        const histogram = service.getHistogramMetric('export_duration_seconds');
        expect(histogram).toBeDefined();
      });

      it('should track duration with timer helper', async () => {
        const endTimer = service.startExportTimer({ format: 'pdf' });

        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));

        const duration = endTimer();
        expect(duration).toBeGreaterThan(0);
      });
    });

    describe('api_latency_seconds', () => {
      it('should observe API latency', () => {
        service.observeApiLatency(0.05, {
          method: 'GET',
          route: '/api/v1/resumes',
          status: '200',
        });

        const histogram = service.getHistogramMetric('api_latency_seconds');
        expect(histogram).toBeDefined();
      });
    });
  });

  describe('Gauge Metrics', () => {
    describe('active_users_total', () => {
      it('should set active users count', async () => {
        service.setActiveUsers(42);
        const value = await service.getMetricValue('active_users_total');
        expect(value).toBe(42);
      });

      it('should increment active users', async () => {
        service.setActiveUsers(10);
        service.incrementActiveUsers();
        const value = await service.getMetricValue('active_users_total');
        expect(value).toBe(11);
      });

      it('should decrement active users', async () => {
        service.setActiveUsers(10);
        service.decrementActiveUsers();
        const value = await service.getMetricValue('active_users_total');
        expect(value).toBe(9);
      });
    });

    describe('pending_exports_total', () => {
      it('should track pending exports', async () => {
        service.setPendingExports(5);
        const value = await service.getMetricValue('pending_exports_total');
        expect(value).toBe(5);
      });

      it('should increment and decrement pending exports', async () => {
        service.incrementPendingExports();
        service.incrementPendingExports();
        service.decrementPendingExports();
        const value = await service.getMetricValue('pending_exports_total');
        expect(value).toBe(1);
      });
    });
  });

  describe('Prometheus Format', () => {
    it('should return metrics in Prometheus text format', async () => {
      service.incrementResumeCreated();
      service.incrementUserSignup({ method: 'email' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('# HELP resume_created_total');
      expect(metrics).toContain('# TYPE resume_created_total counter');
      expect(metrics).toContain('resume_created_total');
    });

    it('should return correct content type', () => {
      expect(service.getContentType()).toBe(
        'text/plain; version=0.0.4; charset=utf-8',
      );
    });
  });

  describe('Reset Metrics', () => {
    it('should reset all metrics for testing', async () => {
      service.incrementResumeCreated();
      service.incrementUserSignup();

      service.resetMetrics();

      const resumeValue = await service.getMetricValue('resume_created_total');
      const signupValue = await service.getMetricValue('user_signup_total');
      expect(resumeValue).toBe(0);
      expect(signupValue).toBe(0);
    });
  });
});
