import { Test, TestingModule } from '@nestjs/testing';
import { DriverInactivityService } from './driver-inactivity.service';
import { AmbulancesService } from './ambulance.service';

describe('DriverInactivityService', () => {
  let service: DriverInactivityService;
  let ambulancesService: jest.Mocked<AmbulancesService>;

  const mockAmbulancesService = {
    removeInactiveDrivers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverInactivityService,
        {
          provide: AmbulancesService,
          useValue: mockAmbulancesService,
        },
      ],
    }).compile();

    service = module.get<DriverInactivityService>(DriverInactivityService);
    ambulancesService = module.get(AmbulancesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkInactiveDrivers', () => {
    it('should check for and remove inactive drivers', async () => {
      const removedDriverIds = ['driver-1', 'driver-2', 'driver-3'];
      ambulancesService.removeInactiveDrivers.mockResolvedValue(
        removedDriverIds,
      );

      await service.checkInactiveDrivers();

      expect(ambulancesService.removeInactiveDrivers).toHaveBeenCalledWith(5);
    });

    it('should handle case when no inactive drivers found', async () => {
      ambulancesService.removeInactiveDrivers.mockResolvedValue([]);

      await service.checkInactiveDrivers();

      expect(ambulancesService.removeInactiveDrivers).toHaveBeenCalledWith(5);
    });

    it('should handle errors gracefully', async () => {
      ambulancesService.removeInactiveDrivers.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.checkInactiveDrivers()).resolves.not.toThrow();
    });

    it('should log when drivers are removed', async () => {
      const removedDriverIds = ['driver-1', 'driver-2'];
      ambulancesService.removeInactiveDrivers.mockResolvedValue(
        removedDriverIds,
      );

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.checkInactiveDrivers();

      expect(logSpy).toHaveBeenCalledWith('Checking for inactive drivers...');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Removed 2 inactive driver(s) from their ambulances',
        ),
      );
    });

    it('should log when no drivers are removed', async () => {
      ambulancesService.removeInactiveDrivers.mockResolvedValue([]);

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.checkInactiveDrivers();

      expect(logSpy).toHaveBeenCalledWith('No inactive drivers found');
    });

    it('should log errors', async () => {
      const error = new Error('Database error');
      ambulancesService.removeInactiveDrivers.mockRejectedValue(error);

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.checkInactiveDrivers();

      expect(errorSpy).toHaveBeenCalledWith(
        'Error checking for inactive drivers:',
        error,
      );
    });
  });
});
