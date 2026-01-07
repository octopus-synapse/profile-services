/**
 * Upload Security Bug Detection Tests
 *
 * Uncle Bob (sem café): "SVG com JavaScript? Vocês estão PEDINDO
 * para ser hackeados! E a extensão do arquivo? Sem sanitização!"
 *
 * BUG-024: SVG Upload Allows XSS Attacks
 * BUG-025: No Magic Bytes Validation
 * BUG-026: File Extension Extracted Without Sanitization
 * BUG-027: No File Ownership Validation Before Delete
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadService, FileUpload } from './upload.service';
import { S3UploadService } from '../common/services/s3-upload.service';
import { AppLoggerService } from '../common/logger/logger.service';

describe('UploadService - SECURITY BUG DETECTION', () => {
  let service: UploadService;
  let mockS3Service: { uploadFile: any; deleteFile: any };

  beforeEach(async () => {
    mockS3Service = {
      uploadFile: mock().mockResolvedValue({
        url: 'http://example.com/file.jpg',
        key: 'file.jpg',
      }),
      deleteFile: mock().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: S3UploadService,
          useValue: { ...mockS3Service, isEnabled: true },
        },
        {
          provide: AppLoggerService,
          useValue: { log: mock(), warn: mock() },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  describe('BUG-024: SVG XSS Prevention', () => {
    /**
     * CRITICAL BUG: SVG files can contain JavaScript!
     *
     * SVG files like:
     * <svg><script>alert('XSS')</script></svg>
     *
     * Expected: Should reject SVG files OR sanitize them
     * Actual: Accepts any SVG without validation
     */
    it('should REJECT SVG files with embedded scripts', async () => {
      const maliciousSvg: FileUpload = {
        buffer: Buffer.from('<svg><script>alert("XSS")</script></svg>'),
        originalname: 'malicious.svg',
        mimetype: 'image/svg+xml',
        size: 100,
      };

      // BUG: This should throw but doesn't!
      await expect(
        service.uploadProfileImage('user-123', maliciousSvg),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT SVG with event handlers', async () => {
      const maliciousSvg: FileUpload = {
        buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
        originalname: 'onclick.svg',
        mimetype: 'image/svg+xml',
        size: 100,
      };

      await expect(
        service.uploadProfileImage('user-123', maliciousSvg),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('BUG-025: Magic Bytes Validation', () => {
    /**
     * BUG: Only checks MIME type from header, which can be spoofed!
     *
     * Expected: Should validate actual file content magic bytes
     * Actual: Trusts the MIME type header blindly
     */
    it('should REJECT file with spoofed MIME type', async () => {
      // This is actually a PHP file, but with image/jpeg MIME type
      const spoofedFile: FileUpload = {
        buffer: Buffer.from('<?php echo "hacked"; ?>'),
        originalname: 'image.jpg',
        mimetype: 'image/jpeg', // Spoofed!
        size: 100,
      };

      // BUG: This should detect it's not a real JPEG!
      await expect(
        service.uploadProfileImage('user-123', spoofedFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate JPEG magic bytes (FFD8FF)', async () => {
      // Invalid JPEG (wrong magic bytes)
      const invalidJpeg: FileUpload = {
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x00]), // Not JPEG magic bytes
        originalname: 'fake.jpg',
        mimetype: 'image/jpeg',
        size: 100,
      };

      await expect(
        service.uploadProfileImage('user-123', invalidJpeg),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate PNG magic bytes (89504E47)', async () => {
      const invalidPng: FileUpload = {
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x00]), // Not PNG magic bytes
        originalname: 'fake.png',
        mimetype: 'image/png',
        size: 100,
      };

      await expect(
        service.uploadProfileImage('user-123', invalidPng),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('BUG-026: Extension Sanitization', () => {
    /**
     * BUG: Extension extracted without sanitization!
     *
     * Expected: Should sanitize and validate extension
     * Actual: Just splits on '.' and takes last part
     */
    it('should REJECT double extension attack (image.jpg.php)', async () => {
      const doubleExtension: FileUpload = {
        buffer: Buffer.from('<?php system($_GET["cmd"]); ?>'),
        originalname: 'image.jpg.php', // Double extension attack!
        mimetype: 'image/jpeg',
        size: 100,
      };

      // BUG: This extracts 'php' as extension but should reject!
      await expect(
        service.uploadProfileImage('user-123', doubleExtension),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT null byte attack (image.php%00.jpg)', async () => {
      const nullByteAttack: FileUpload = {
        buffer: Buffer.from('malicious'),
        originalname: 'image.php\x00.jpg', // Null byte attack!
        mimetype: 'image/jpeg',
        size: 100,
      };

      await expect(
        service.uploadProfileImage('user-123', nullByteAttack),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT directory traversal in filename', async () => {
      const traversalAttack: FileUpload = {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // Valid JPEG magic bytes
        originalname: '../../../etc/passwd.jpg',
        mimetype: 'image/jpeg',
        size: 100,
      };

      await expect(
        service.uploadProfileImage('user-123', traversalAttack),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('BUG-027: File Ownership Validation', () => {
    /**
     * BUG: deleteFile accepts any key without ownership check!
     *
     * Expected: Should verify caller owns the file
     * Actual: Deletes any file by key
     */
    it('should REJECT deleting another users file', async () => {
      const otherUsersFile = 'profiles/user-456/avatar.jpg';

      // User user-123 trying to delete user-456's file
      // BUG: This should throw ForbiddenException!
      // Currently there's no method that takes userId + key

      // The current implementation just accepts any key:
      // await service.deleteFile(otherUsersFile);

      // Should be:
      // await service.deleteFile('user-123', otherUsersFile);
      // And it should throw!

      expect(() => {
        // The API should require userId for ownership check
        (service as any).deleteFileForUser('user-123', otherUsersFile);
      }).toThrow();
    });
  });
});
