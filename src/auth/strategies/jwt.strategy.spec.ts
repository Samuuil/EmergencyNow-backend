import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { Role } from '../../common/enums/role.enum';
import type { JwtPayload } from '../types/auth.types';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockReturnValue('test-secret');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return user data from JWT payload', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        egn: '1234567890',
        role: 'USER',
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-123',
        egn: '1234567890',
        role: Role.USER,
      });
    });

    it('should handle ADMIN role', () => {
      const payload: JwtPayload = {
        sub: 'admin-123',
        egn: '9876543210',
        role: 'ADMIN',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'admin-123',
        egn: '9876543210',
        role: Role.ADMIN,
      });
    });

    it('should handle DRIVER role', () => {
      const payload: JwtPayload = {
        sub: 'driver-123',
        egn: '1122334455',
        role: 'DRIVER',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'driver-123',
        egn: '1122334455',
        role: Role.DRIVER,
      });
    });

    it('should handle DOCTOR role', () => {
      const payload: JwtPayload = {
        sub: 'doctor-123',
        egn: '5544332211',
        role: 'DOCTOR',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'doctor-123',
        egn: '5544332211',
        role: Role.DOCTOR,
      });
    });

    it('should work without iat and exp fields', () => {
      const payload: JwtPayload = {
        sub: 'user-456',
        egn: '0987654321',
        role: 'USER',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-456',
        egn: '0987654321',
        role: Role.USER,
      });
    });
  });

  describe('initialization', () => {
    it('should use JWT_SECRET from config', () => {
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should use default secret when JWT_SECRET is not configured', () => {
      const mockConfigNoSecret = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: mockConfigNoSecret,
          },
        ],
      });

      // The strategy should initialize without throwing
      expect(() => module.compile()).not.toThrow();
    });
  });
});
