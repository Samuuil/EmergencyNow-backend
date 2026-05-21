import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DispatcherService } from './dispatcher.service';
import { Call } from '../calls/entities/call.entity';
import { StateArchive } from '../state-archive/entities/state-archive.entity';
import { AmbulancesService } from '../ambulances/ambulance.service';
import { DispatcherGateway } from '../realtime/dispatcher.gateway';
import { DriverGateway } from '../realtime/driver.gateway';
import { UserGateway } from '../realtime/user.gateway';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { NotificationService } from '../notification/notification.service';
import { RedisService } from '../common/redis/redis.service';
import { ConfigService } from '@nestjs/config';

describe('DispatcherService', () => {
  let service: DispatcherService;
  let driverGateway: jest.Mocked<DriverGateway>;
  let dispatcherGateway: jest.Mocked<DispatcherGateway>;
  let ambulancesService: jest.Mocked<AmbulancesService>;

  beforeEach(async () => {
    const mockDriverGateway = {
      refreshAvailableAmbulanceLocations: jest.fn().mockResolvedValue(undefined),
      isDriverOnline: jest.fn().mockReturnValue(true),
    };

    const mockDispatcherGateway = {
      getOnlineDispatcherIds: jest.fn().mockReturnValue([]),
      broadcastAmbulanceListUpdated: jest.fn(),
    };

    const mockAmbulancesService = {
      findAvailableList: jest.fn().mockResolvedValue([]),
    };

    const mockRedisService = {
      addDispatcherCall: jest.fn().mockResolvedValue(undefined),
      removeDispatcherCall: jest.fn().mockResolvedValue(undefined),
      getDispatcherLoad: jest.fn().mockResolvedValue(0),
      dispatcherHoldsCall: jest.fn().mockResolvedValue(false),
      getCallHolder: jest.fn().mockResolvedValue(null),
      clearDispatcherCalls: jest.fn().mockResolvedValue([]),
      addSeenDispatcher: jest.fn().mockResolvedValue(undefined),
      getSeenDispatchers: jest.fn().mockResolvedValue([]),
      removeSeenDispatcher: jest.fn().mockResolvedValue(undefined),
      clearSeenDispatchers: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatcherService,
        { provide: getRepositoryToken(Call), useValue: {} },
        { provide: getRepositoryToken(StateArchive), useValue: {} },
        { provide: AmbulancesService, useValue: mockAmbulancesService },
        { provide: DispatcherGateway, useValue: mockDispatcherGateway },
        { provide: DriverGateway, useValue: mockDriverGateway },
        { provide: UserGateway, useValue: {} },
        { provide: GoogleMapsService, useValue: {} },
        {
          provide: NotificationService,
          useValue: {
            sendCallOffer: jest.fn().mockResolvedValue(undefined),
            sendCallCancelled: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, def?: unknown) => def) },
        },
      ],
    }).compile();

    service = module.get<DispatcherService>(DispatcherService);
    driverGateway = module.get(DriverGateway);
    dispatcherGateway = module.get(DispatcherGateway);
    ambulancesService = module.get(AmbulancesService);
  });

  describe('onRefreshRequested', () => {
    it('should delegate to DriverGateway.refreshAvailableAmbulanceLocations', async () => {
      await service.onRefreshRequested();
      expect(driverGateway.refreshAvailableAmbulanceLocations).toHaveBeenCalledTimes(1);
    });
  });

  describe('onLocationsRefreshed', () => {
    it('should broadcast updated ambulance list to all online dispatchers', async () => {
      dispatcherGateway.getOnlineDispatcherIds.mockReturnValue([
        'dispatcher-1',
        'dispatcher-2',
      ]);
      const ambulances = [
        {
          id: 'amb-1',
          licensePlate: 'AB1234',
          vehicleModel: null,
          latitude: 42.7,
          longitude: 23.3,
          driverId: 'driver-1',
          available: true,
        },
      ];
      ambulancesService.findAvailableList.mockResolvedValue(ambulances as any);

      await service.onLocationsRefreshed();

      expect(dispatcherGateway.broadcastAmbulanceListUpdated).toHaveBeenCalledWith(
        ['dispatcher-1', 'dispatcher-2'],
        expect.objectContaining({
          ambulances: expect.arrayContaining([
            expect.objectContaining({ id: 'amb-1', driverOnline: true }),
          ]),
        }),
      );
    });

    it('should not broadcast when no dispatchers are online', async () => {
      dispatcherGateway.getOnlineDispatcherIds.mockReturnValue([]);

      await service.onLocationsRefreshed();

      expect(dispatcherGateway.broadcastAmbulanceListUpdated).not.toHaveBeenCalled();
      expect(ambulancesService.findAvailableList).not.toHaveBeenCalled();
    });
  });
});
