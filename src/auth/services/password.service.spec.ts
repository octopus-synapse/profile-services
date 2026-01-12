/**
 * Password Service Tests - Fast mocked version
 */

import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as bcrypt from 'bcryptjs';
import { PasswordService } from './password.service';

// Mock bcrypt for fast tests
const mockHash = spyOn(bcrypt, 'hash');
const mockCompare = spyOn(bcrypt, 'compare');

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
    mockHash.mockReset();
    mockCompare.mockReset();
  });

  describe('hash', () => {
    it('should call bcrypt.hash with correct parameters', async () => {
      mockHash.mockResolvedValue('$2a$12$hashedpassword' as never);

      const result = await service.hash('testPassword123');

      expect(mockHash).toHaveBeenCalledWith('testPassword123', 12);
      expect(result).toBe('$2a$12$hashedpassword');
    });

    it('should return hashed password', async () => {
      mockHash.mockResolvedValue('$2a$12$differenthash' as never);

      const result = await service.hash('anyPassword');

      expect(result).toMatch(/^\$2a\$/);
    });
  });

  describe('compare', () => {
    it('should return true when passwords match', async () => {
      mockCompare.mockResolvedValue(true as never);

      const result = await service.compare('password', '$2a$12$hash');

      expect(mockCompare).toHaveBeenCalledWith('password', '$2a$12$hash');
      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', async () => {
      mockCompare.mockResolvedValue(false as never);

      const result = await service.compare('wrong', '$2a$12$hash');

      expect(result).toBe(false);
    });
  });
});
