import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DriverGateway } from './driver.gateway';
import { AmbulancesService } from '../ambulances/ambulance.service';
import type { DriverSocket } from './driver.types';

describe('DriverGateway', () => {
  let gateway: DriverGateway;
  let ambulancesService: jest.Mocked<AmbulancesService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEventEmitter = {
    emitAsync: jest.fn().mockResolvedValue([]),
  };

  const mockAmbulancesService = {
    updateLocation: jest.fn(),
    getDriverIdToAmbulanceIdMap: jest.fn(),
    bulkUpdateLocations: jest.fn(),
  };

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
        DriverGateway,
        {
          provide: AmbulancesService,
          useValue: mockAmbulancesService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    gateway = module.get<DriverGateway>(DriverGateway);
    ambulancesService = module.get(AmbulancesService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);

    gateway.server = mockServer as any;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    const createMockClient = (handshake: any): DriverSocket =>
      ({
        id: 'socket-123',
        handshake,
        disconnect: jest.fn(),
      }) as any;

    it('should connect driver with valid token from header', () => {
      const mockPayload = {
        sub: 'driver-123',
        role: 'DRIVER',
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
        id: 'driver-123',
        role: 'DRIVER',
      });
      expect(gateway.isDriverOnline('driver-123')).toBe(true);
      expect(client.disconnect).not.toHaveBeenCalled();
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
  });

  describe('handleDisconnect', () => {
    it('should remove driver from connected drivers', () => {
      const mockPayload = {
        sub: 'driver-123',
        role: 'DRIVER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);
      expect(gateway.isDriverOnline('driver-123')).toBe(true);

      gateway.handleDisconnect(client);
      expect(gateway.isDriverOnline('driver-123')).toBe(false);
    });

    it('should handle disconnect for unknown client', () => {
      const client: DriverSocket = {
        id: 'unknown-socket',
        disconnect: jest.fn(),
      } as any;

      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('onDriverRespond', () => {
    it('should emit driver.responded event when driver accepts', async () => {
      const mockPayload = { sub: 'driver-123', role: 'DRIVER' };
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-123',
        handshake: { headers: { authorization: 'Bearer valid-token' } },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);
      await gateway.onDriverRespond(client, { callId: 'call-123', accept: true });

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith('driver.responded', {
        callId: 'call-123',
        driverId: 'driver-123',
        accept: true,
      });
    });

    it('should emit driver.responded event when driver rejects', async () => {
      const mockPayload = { sub: 'driver-456', role: 'DRIVER' };
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-456',
        handshake: { headers: { authorization: 'Bearer valid-token' } },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);
      await gateway.onDriverRespond(client, { callId: 'call-456', accept: false });

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith('driver.responded', {
        callId: 'call-456',
        driverId: 'driver-456',
        accept: false,
      });
    });
  });

  describe('onLocationUpdate', () => {
    it('should emit driver.location.updated event with correct payload', async () => {
      const mockPayload = { sub: 'driver-123', role: 'DRIVER' };
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-123',
        handshake: { headers: { authorization: 'Bearer valid-token' } },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      await gateway.onLocationUpdate(client, {
        callId: 'call-123',
        latitude: 42.7,
        longitude: 23.3,
      });

      expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
        'driver.location.updated',
        { callId: 'call-123', latitude: 42.7, longitude: 23.3, driverId: 'driver-123' },
      );
    });
  });

  describe('offerCall', () => {
    it('should emit call offer to driver', () => {
      const mockPayload = {
        sub: 'driver-123',
        role: 'DRIVER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      gateway.offerCall({
        callId: 'call-123',
        description: 'Emergency',
        latitude: 42.7,
        longitude: 23.3,
        ambulanceId: 'amb-123',
        driverId: 'driver-123',
        distance: 5000,
        duration: 600,
      });

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'call.offer',
        expect.objectContaining({
          callId: 'call-123',
          description: 'Emergency',
        }),
      );
    });

    it('should not emit when driver is offline', () => {
      gateway.offerCall({
        callId: 'call-123',
        description: 'Emergency',
        latitude: 42.7,
        longitude: 23.3,
        ambulanceId: 'amb-123',
        driverId: 'offline-driver',
        distance: 5000,
        duration: 600,
      });

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('call offer management', () => {
    it('should add rejection for call', () => {
      gateway.addRejection('call-123', 'amb-123');
      const rejected = gateway.getRejectedAmbulanceIds('call-123');

      expect(rejected).toContain('amb-123');
    });

    it('should get pending ambulance ID', () => {
      gateway.setPendingAmbulance('call-123', 'amb-456');
      const pendingId = gateway.getPendingAmbulanceId('call-123');

      expect(pendingId).toBe('amb-456');
    });

    it('should clear call offer', () => {
      gateway.setPendingAmbulance('call-123', 'amb-123');
      gateway.clearOffer('call-123');

      const pendingId = gateway.getPendingAmbulanceId('call-123');
      expect(pendingId).toBeNull();
    });
  });

  describe('sendRouteToDriver', () => {
    it('should send route to online driver', () => {
      const mockPayload = {
        sub: 'driver-123',
        role: 'DRIVER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      const routePayload = {
        callId: 'call-123',
        route: {
          polyline: 'encoded-polyline',
          distance: 5000,
          duration: 600,
          steps: [],
        },
      };

      gateway.sendRouteToDriver('driver-123', routePayload);

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
      expect(mockServer.emit).toHaveBeenCalledWith('call.route', routePayload);
    });
  });

  describe('refreshAvailableAmbulanceLocations', () => {
    it('should broadcast location.request to online drivers and return immediately', async () => {
      const mockPayload = { sub: 'driver-123', role: 'DRIVER' };
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-123',
        handshake: { headers: { authorization: 'Bearer valid-token' } },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      const driverMap = new Map([['driver-123', 'amb-123']]);
      ambulancesService.getDriverIdToAmbulanceIdMap.mockResolvedValue(driverMap);
      ambulancesService.updateLocation.mockResolvedValue({} as any);

      await gateway.refreshAvailableAmbulanceLocations();

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'location.request',
        expect.objectContaining({ requestId: 1 }),
      );
    });

    it('should update DB when driver responds to location.request', async () => {
      const mockPayload = { sub: 'driver-123', role: 'DRIVER' };
      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-123',
        handshake: { headers: { authorization: 'Bearer valid-token' } },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      const driverMap = new Map([['driver-123', 'amb-123']]);
      ambulancesService.getDriverIdToAmbulanceIdMap.mockResolvedValue(driverMap);
      ambulancesService.updateLocation.mockResolvedValue({} as any);

      await gateway.refreshAvailableAmbulanceLocations();

      await gateway.onLocationResponse(client, {
        requestId: 1,
        latitude: 42.7,
        longitude: 23.3,
      });

      expect(ambulancesService.updateLocation).toHaveBeenCalledWith(
        'amb-123',
        42.7,
        23.3,
      );
    });

    it('should handle case when no drivers are online', async () => {
      ambulancesService.getDriverIdToAmbulanceIdMap.mockResolvedValue(
        new Map(),
      );

      await gateway.refreshAvailableAmbulanceLocations();

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('isDriverOnline', () => {
    it('should return true for online driver', () => {
      const mockPayload = {
        sub: 'driver-123',
        role: 'DRIVER',
        egn: '1234567890',
      };

      configService.get.mockReturnValue('test-secret');
      jwtService.verify.mockReturnValue(mockPayload);

      const client: DriverSocket = {
        id: 'socket-123',
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
        },
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(client);

      expect(gateway.isDriverOnline('driver-123')).toBe(true);
    });

    it('should return false for offline driver', () => {
      expect(gateway.isDriverOnline('offline-driver')).toBe(false);
    });
  });
});
