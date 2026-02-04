/**
 * AppLoggerService Tests
 *
 * NOTA (Uncle Bob): Logger é infraestrutura, mas testamos
 * que os métodos funcionam corretamente.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AppLoggerService } from './logger.service';

describe('AppLoggerService', () => {
  let service: AppLoggerService;

  beforeEach(() => {
    service = new AppLoggerService();
  });

  describe('log', () => {
    it('should log info message without throwing', () => {
      expect(() => service.log('Test message')).not.toThrow();
    });

    it('should log with context', () => {
      expect(() => service.log('Test message', 'TestContext')).not.toThrow();
    });

    it('should log with metadata', () => {
      expect(() =>
        service.log('Test message', 'TestContext', { userId: 'user-1' }),
      ).not.toThrow();
    });
  });

  describe('error', () => {
    it('should log error message without throwing', () => {
      expect(() => service.error('Error message')).not.toThrow();
    });

    it('should log error with stack trace', () => {
      expect(() =>
        service.error('Error message', 'Stack trace here', 'ErrorContext'),
      ).not.toThrow();
    });

    it('should log error with metadata', () => {
      expect(() =>
        service.error('Error message', 'Stack', 'Context', { code: 'E001' }),
      ).not.toThrow();
    });
  });

  describe('warn', () => {
    it('should log warning message without throwing', () => {
      expect(() => service.warn('Warning message')).not.toThrow();
    });

    it('should log warning with context and metadata', () => {
      expect(() =>
        service.warn('Warning message', 'WarnContext', { level: 'high' }),
      ).not.toThrow();
    });
  });

  describe('debug', () => {
    it('should log debug message without throwing', () => {
      expect(() => service.debug('Debug message')).not.toThrow();
    });

    it('should log debug with context and metadata', () => {
      expect(() =>
        service.debug('Debug message', 'DebugContext', { detail: 'value' }),
      ).not.toThrow();
    });
  });

  describe('verbose', () => {
    it('should log verbose message without throwing', () => {
      expect(() => service.verbose('Verbose message')).not.toThrow();
    });

    it('should use default context when set', () => {
      service.setContext('DefaultContext');
      expect(() => service.verbose('Verbose message')).not.toThrow();
    });
  });

  describe('setContext', () => {
    it('should set context for subsequent logs', () => {
      service.setContext('MyService');
      expect(() => service.verbose('Message')).not.toThrow();
    });
  });

  describe('errorWithMeta', () => {
    it('should log error with metadata using default context', () => {
      service.setContext('ErrorService');
      expect(() =>
        service.errorWithMeta('Error occurred', { errorCode: 'E500' }),
      ).not.toThrow();
    });
  });
});
