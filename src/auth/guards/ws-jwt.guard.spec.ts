import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';
import type { WsClient } from '../types/ws.types';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsJwtGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<WsJwtGuard>(WsJwtGuard);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const createMockClient = (handshake: any): WsClient =>
      ({
        handshake,
      }) as any;

    const createMockContext = (client: WsClient): ExecutionContext =>
      ({
        switchToWs: () => ({
          getClient: () => client,
        }),
      }) as any;

    it('should authenticate with token from Authorization header', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const context = createMockContext(client);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(client.user).toEqual({
        id: 'user-123',
        role: 'USER',
      });
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
    });

    it('should authenticate with token from auth object', () => {
      const mockPayload = {
        sub: 'user-456',
        role: 'DRIVER',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        auth: {
          token: 'auth-token',
        },
      });

      const context = createMockContext(client);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(client.user).toBeDefined();
      expect(client.user!.id).toBe('user-456');
    });

    it('should authenticate with token from query parameter', () => {
      const mockPayload = {
        sub: 'user-789',
        role: 'ADMIN',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        query: {
          token: 'query-token',
        },
      });

      const context = createMockContext(client);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(client.user!.id).toBe('user-789');
    });

    it('should throw UnauthorizedException when no token provided', () => {
      const client = createMockClient({
        headers: {},
      });

      const context = createMockContext(client);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Missing token');
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const client = createMockClient({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const context = createMockContext(client);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid token');
    });

    it('should use default secret when JWT_SECRET is not configured', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue(undefined);
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const context = createMockContext(client);
      guard.canActivate(context);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'defaultSecret',
      });
    });

    it('should handle uppercase Authorization header', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      const context = createMockContext(client);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should prioritize Authorization header over auth object', () => {
      const mockPayload = {
        sub: 'user-from-header',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        headers: {
          authorization: 'Bearer header-token',
        },
        auth: {
          token: 'auth-token',
        },
      });

      const context = createMockContext(client);
      guard.canActivate(context);

      expect(jwtService.verify).toHaveBeenCalledWith('header-token', {
        secret: 'test-secret',
      });
    });
  });
});
