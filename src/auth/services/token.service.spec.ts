/**
 * Token Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenService, JwtUserPayload } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: JwtUserPayload = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
    hasCompletedOnboarding: true,
  };

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService);
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const expectedToken = 'jwt-token-123';
      jwtService.sign.mockReturnValue(expectedToken);

      const result = service.generateToken(mockUser);

      expect(result).toBe(expectedToken);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
      });
    });

    it('should default hasCompletedOnboarding to false when null', () => {
      const userWithNullOnboarding = {
        ...mockUser,
        hasCompletedOnboarding: null as unknown as boolean,
      };
      jwtService.sign.mockReturnValue('token');

      service.generateToken(userWithNullOnboarding);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          hasCompletedOnboarding: false,
        }),
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify and return decoded token', () => {
      const mockPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        hasCompletedOnboarding: true,
      };
      jwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should throw when token is invalid', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => service.verifyToken('invalid-token')).toThrow(
        'Invalid token',
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      jwtService.decode.mockReturnValue(mockPayload);

      const result = service.decodeToken('any-token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.decode).toHaveBeenCalledWith('any-token');
    });

    it('should return null for invalid token', () => {
      jwtService.decode.mockReturnValue(null);

      const result = service.decodeToken('invalid-token');

      expect(result).toBeNull();
    });
  });
});
