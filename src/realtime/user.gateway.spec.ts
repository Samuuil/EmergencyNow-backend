import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserGateway } from './user.gateway';
import type { UserSocket } from './user.types';

describe('UserGateway', () => {
  let gateway: UserGateway;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGateway,
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

    gateway = module.get<UserGateway>(UserGateway);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    gateway.server = mockServer as any;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    const createMockClient = (handshake: any): UserSocket =>
      ({
        id: 'socket-123',
        handshake,
        disconnect: jest.fn(),
      }) as any;

    it('should connect user with valid token from header', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      gateway.handleConnection(client);

      expect(client.user).toEqual({
        id: 'user-123',
        role: 'USER',
        egn: '1234567890',
      });
      expect(gateway.isUserOnline('user-123')).toBe(true);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should connect user with token from auth object', () => {
      const mockPayload = {
        sub: 'user-456',
        role: 'USER',
        egn: '0987654321',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        auth: {
          token: 'auth-token',
        },
      });

      gateway.handleConnection(client);

      expect(client.user!.id).toBe('user-456');
      expect(gateway.isUserOnline('user-456')).toBe(true);
    });

    it('should connect user with token from query parameter', () => {
      const mockPayload = {
        sub: 'user-789',
        role: 'USER',
        egn: '1122334455',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client = createMockClient({
        query: {
          token: 'query-token',
        },
      });

      gateway.handleConnection(client);

      expect(client.user!.id).toBe('user-789');
      expect(gateway.isUserOnline('user-789')).toBe(true);
    });

    it('should disconnect client when no token provided', () => {
      const client = createMockClient({
        headers: {},
      });

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should disconnect client with invalid token', () => {
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const client = createMockClient({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
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

      gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'defaultSecret',
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should remove user from connected users', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: UserSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);
      expect(gateway.isUserOnline('user-123')).toBe(true);

      gateway.handleDisconnect(client);
      expect(gateway.isUserOnline('user-123')).toBe(false);
    });

    it('should handle disconnect for unknown client', () => {
      const client: UserSocket = {
        id: 'unknown-socket',
        disconnect: jest.fn(),
      } as any;

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('notifyCallDispatched', () => {
    it('should emit call dispatched event to online user', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: UserSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      const payload = {
        callId: 'call-123',
        ambulanceId: 'amb-123',
        ambulanceLocation: { latitude: 42.7, longitude: 23.3 },
        route: {
          polyline: 'encoded-polyline',
          distance: 5000,
          duration: 600,
          steps: [],
        },
      };

      gateway.notifyCallDispatched('user-123', payload);

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
      expect(mockServer.emit).toHaveBeenCalledWith('call.dispatched', payload);
    });

    it('should not emit when user is offline', () => {
      const payload = {
        callId: 'call-123',
        ambulanceId: 'amb-123',
        ambulanceLocation: { latitude: 42.7, longitude: 23.3 },
        route: {
          polyline: 'encoded-polyline',
          distance: 5000,
          duration: 600,
          steps: [],
        },
      };

      gateway.notifyCallDispatched('offline-user', payload);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('notifyLocationUpdate', () => {
    it('should emit ambulance location update to online user', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: UserSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      const payload = {
        callId: 'call-123',
        ambulanceLocation: { latitude: 42.75, longitude: 23.35 },
        route: {
          polyline: 'updated-polyline',
          distance: 4500,
          duration: 550,
          steps: [],
        },
      };

      gateway.notifyLocationUpdate('user-123', payload);

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'ambulance.location',
        payload,
      );
    });

    it('should emit location update with null route', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: UserSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      const payload = {
        callId: 'call-123',
        ambulanceLocation: { latitude: 42.75, longitude: 23.35 },
        route: null,
      };

      gateway.notifyLocationUpdate('user-123', payload);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'ambulance.location',
        payload,
      );
    });

    it('should not emit when user is offline', () => {
      const payload = {
        callId: 'call-123',
        ambulanceLocation: { latitude: 42.75, longitude: 23.35 },
        route: null,
      };

      gateway.notifyLocationUpdate('offline-user', payload);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('notifyStatusChange', () => {
    it('should emit call status change to online user', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: UserSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      const payload = {
        callId: 'call-123',
        status: 'COMPLETED',
      };

      gateway.notifyStatusChange('user-123', payload);

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
      expect(mockServer.emit).toHaveBeenCalledWith('call.status', payload);
    });

    it('should not emit when user is offline', () => {
      const payload = {
        callId: 'call-123',
        status: 'COMPLETED',
      };

      gateway.notifyStatusChange('offline-user', payload);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('isUserOnline', () => {
    it('should return true for online user', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'USER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: UserSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      expect(gateway.isUserOnline('user-123')).toBe(true);
    });

    it('should return false for offline user', () => {
      expect(gateway.isUserOnline('offline-user')).toBe(false);
    });
  });

  describe('multiple users', () => {
    it('should handle multiple connected users', () => {
      configService.get.mockReturnValue('test-secret');

      const mockPayload1 = { sub: 'user-1', role: 'USER', egn: '1111111111' };
      const mockPayload2 = { sub: 'user-2', role: 'USER', egn: '2222222222' };

      jwtService.verify.mockReturnValueOnce(mockPayload1);

      const client1: UserSocket = {
        id: 'socket-1',
        handshake: {
          headers: { authorization: 'Bearer token-1' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client1);

      jwtService.verify.mockReturnValueOnce(mockPayload2);

      const client2: UserSocket = {
        id: 'socket-2',
        handshake: {
          headers: { authorization: 'Bearer token-2' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client2);

      expect(gateway.isUserOnline('user-1')).toBe(true);
      expect(gateway.isUserOnline('user-2')).toBe(true);

      gateway.handleDisconnect(client1);

      expect(gateway.isUserOnline('user-1')).toBe(false);
      expect(gateway.isUserOnline('user-2')).toBe(true);
    });
  });
});
