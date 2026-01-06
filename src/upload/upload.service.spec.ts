import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadService, FileUpload } from './upload.service';
import { S3UploadService } from '../common/services/s3-upload.service';
import { AppLoggerService } from '../common/logger/logger.service';
import { APP_CONSTANTS, ERROR_MESSAGES } from '../common/constants/config';

describe('UploadService', () => {
  let service: UploadService;
  let mockS3Service: jest.Mocked<S3UploadService>;
  let mockLogger: jest.Mocked<AppLoggerService>;

  const createMockFile = (overrides?: Partial<FileUpload>): FileUpload => ({
    buffer: Buffer.from('fake-image-data'),
    originalname: 'test-image.jpg',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    ...overrides,
  });

  beforeEach(async () => {
    mockS3Service = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      get isEnabled() {
        return true;
      },
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: S3UploadService, useValue: mockS3Service },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadProfileImage', () => {
    const userId = 'user-123';

    it('should upload valid profile image and return result', async () => {
      // Arrange
      const file = createMockFile();
      const expectedResult = {
        url: 'https://s3.amazonaws.com/bucket/profiles/user-123/uuid.jpg',
        key: 'profiles/user-123/uuid.jpg',
      };
      mockS3Service.uploadFile.mockResolvedValue(expectedResult);

      // Act
      const result = await service.uploadProfileImage(userId, file);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        file.buffer,
        expect.stringMatching(/^profiles\/user-123\/[\w-]+\.jpg$/),
        file.mimetype,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Profile image uploaded',
        'UploadService',
        expect.objectContaining({
          userId,
          size: file.size,
        }),
      );
    });

    it('should generate unique keys for multiple uploads', async () => {
      // Arrange
      const file = createMockFile();
      mockS3Service.uploadFile.mockResolvedValue({
        url: 'https://s3.amazonaws.com/bucket/key',
        key: 'key',
      });

      // Act
      await service.uploadProfileImage(userId, file);
      await service.uploadProfileImage(userId, file);

      // Assert
      const firstCall = mockS3Service.uploadFile.mock.calls[0][1];
      const secondCall = mockS3Service.uploadFile.mock.calls[1][1];
      expect(firstCall).not.toBe(secondCall);
    });

    it('should preserve file extension in uploaded key', async () => {
      // Arrange
      const pngFile = createMockFile({
        originalname: 'test.png',
        mimetype: 'image/png',
      });
      mockS3Service.uploadFile.mockResolvedValue({
        url: 'https://s3.amazonaws.com/bucket/key',
        key: 'key',
      });

      // Act
      await service.uploadProfileImage(userId, pngFile);

      // Assert
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/\.png$/),
        'image/png',
      );
    });

    it('should throw BadRequestException when file size exceeds limit', async () => {
      // Arrange
      const largeFile = createMockFile({
        size: APP_CONSTANTS.MAX_FILE_SIZE + 1,
      });

      // Act & Assert
      await expect(
        service.uploadProfileImage(userId, largeFile),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadProfileImage(userId, largeFile),
      ).rejects.toThrow(/File size exceeds maximum allowed size/);
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid MIME type', async () => {
      // Arrange
      const invalidFile = createMockFile({
        mimetype: 'application/pdf',
        originalname: 'document.pdf',
      });

      // Act & Assert
      await expect(
        service.uploadProfileImage(userId, invalidFile),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadProfileImage(userId, invalidFile),
      ).rejects.toThrow(/Invalid file type/);
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when S3 upload fails', async () => {
      // Arrange
      const file = createMockFile();
      mockS3Service.uploadFile.mockResolvedValue(null);

      // Act & Assert
      await expect(service.uploadProfileImage(userId, file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadProfileImage(userId, file)).rejects.toThrow(
        ERROR_MESSAGES.FILE_UPLOAD_UNAVAILABLE,
      );
    });
  });

  describe('uploadCompanyLogo', () => {
    const userId = 'user-123';
    const resumeId = 'resume-456';

    it('should upload valid company logo and return result', async () => {
      // Arrange
      const file = createMockFile();
      const expectedResult = {
        url: 'https://s3.amazonaws.com/bucket/logos/user-123/resume-456/uuid.jpg',
        key: 'logos/user-123/resume-456/uuid.jpg',
      };
      mockS3Service.uploadFile.mockResolvedValue(expectedResult);

      // Act
      const result = await service.uploadCompanyLogo(userId, resumeId, file);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        file.buffer,
        expect.stringMatching(/^logos\/user-123\/resume-456\/[\w-]+\.jpg$/),
        file.mimetype,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Company logo uploaded',
        'UploadService',
        expect.objectContaining({
          userId,
          resumeId,
          size: file.size,
        }),
      );
    });

    it('should throw BadRequestException for oversized file', async () => {
      // Arrange
      const largeFile = createMockFile({
        size: APP_CONSTANTS.MAX_FILE_SIZE + 1000,
      });

      // Act & Assert
      await expect(
        service.uploadCompanyLogo(userId, resumeId, largeFile),
      ).rejects.toThrow(BadRequestException);
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when S3 upload fails', async () => {
      // Arrange
      const file = createMockFile();
      mockS3Service.uploadFile.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.uploadCompanyLogo(userId, resumeId, file),
      ).rejects.toThrow(ERROR_MESSAGES.FILE_UPLOAD_UNAVAILABLE);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully and log result', async () => {
      // Arrange
      const key = 'profiles/user-123/image.jpg';
      mockS3Service.deleteFile.mockResolvedValue(true);

      // Act
      const result = await service.deleteFile(key);

      // Assert
      expect(result).toBe(true);
      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(key);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'File deleted',
        'UploadService',
        { key },
      );
    });

    it('should return false when deletion fails without throwing', async () => {
      // Arrange
      const key = 'profiles/user-123/image.jpg';
      mockS3Service.deleteFile.mockResolvedValue(false);

      // Act
      const result = await service.deleteFile(key);

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });
  });

  describe('isServiceAvailable', () => {
    it('should return true when S3 service is enabled', () => {
      // Act
      const result = service.isServiceAvailable();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when S3 service is disabled', () => {
      // Arrange
      mockS3Service = {
        uploadFile: jest.fn(),
        deleteFile: jest.fn(),
        get isEnabled() {
          return false;
        },
      } as any;
      service = new UploadService(mockS3Service, mockLogger);

      // Act
      const result = service.isServiceAvailable();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('file validation', () => {
    it('should accept all allowed MIME types', async () => {
      // Arrange
      const allowedTypes = APP_CONSTANTS.ALLOWED_IMAGE_TYPES;
      mockS3Service.uploadFile.mockResolvedValue({
        url: 'https://s3.amazonaws.com/bucket/key',
        key: 'key',
      });

      // Act & Assert
      for (const mimetype of allowedTypes) {
        const file = createMockFile({ mimetype });
        await expect(
          service.uploadProfileImage('user-123', file),
        ).resolves.toBeDefined();
      }
    });

    it('should handle files at exact size limit', async () => {
      // Arrange
      const file = createMockFile({
        size: APP_CONSTANTS.MAX_FILE_SIZE,
      });
      mockS3Service.uploadFile.mockResolvedValue({
        url: 'https://s3.amazonaws.com/bucket/key',
        key: 'key',
      });

      // Act & Assert
      await expect(
        service.uploadProfileImage('user-123', file),
      ).resolves.toBeDefined();
    });

    it('should handle filenames with multiple dots correctly', async () => {
      // Arrange
      const file = createMockFile({
        originalname: 'my.profile.image.png',
      });
      mockS3Service.uploadFile.mockResolvedValue({
        url: 'https://s3.amazonaws.com/bucket/key',
        key: 'key',
      });

      // Act
      await service.uploadProfileImage('user-123', file);

      // Assert
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/\.png$/),
        expect.any(String),
      );
    });

    it('should convert extension to lowercase', async () => {
      // Arrange
      const file = createMockFile({
        originalname: 'IMAGE.JPG',
      });
      mockS3Service.uploadFile.mockResolvedValue({
        url: 'https://s3.amazonaws.com/bucket/key',
        key: 'key',
      });

      // Act
      await service.uploadProfileImage('user-123', file);

      // Assert
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/\.jpg$/),
        expect.any(String),
      );
    });
  });
});
