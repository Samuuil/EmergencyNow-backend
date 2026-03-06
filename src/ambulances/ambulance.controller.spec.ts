import { Test, TestingModule } from '@nestjs/testing';
import { AmbulancesController } from './ambulance.controller';
import { AmbulancesService } from './ambulance.service';
import { Ambulance } from './entities/ambulance.entity';
import { CreateAmbulanceDto } from './dtos/createAmbulance.dto';
import { UpdateAmbulanceDto } from './dtos/updateAmbulance.dto';
import { AssignDriverDto } from './dtos/assign-driver.dto';
import { PaginateQuery } from 'nestjs-paginate';

describe('AmbulancesController', () => {
  let controller: AmbulancesController;
  let service: jest.Mocked<AmbulancesService>;

  const mockAmbulance: Ambulance = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    licensePlate: 'ABC-1234',
    vehicleModel: 'Mercedes Sprinter',
    latitude: 42.6977,
    longitude: 23.3219,
    available: true,
    driverId: null,
    lastCallAcceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAmbulancesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findAvailable: jest.fn(),
    findByDriver: jest.fn(),
    updateLocation: jest.fn(),
    assignDriver: jest.fn(),
    removeDriver: jest.fn(),
    markAsAvailable: jest.fn(),
    markAsDispatched: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmbulancesController],
      providers: [
        {
          provide: AmbulancesService,
          useValue: mockAmbulancesService,
        },
      ],
    }).compile();

    controller = module.get<AmbulancesController>(AmbulancesController);
    service = module.get(AmbulancesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createAmbulanceDto: CreateAmbulanceDto = {
      licensePlate: 'ABC-1234',
      vehicleModel: 'Mercedes Sprinter',
    };

    it('should create an ambulance', async () => {
      service.create.mockResolvedValue(mockAmbulance);

      const result = await controller.create(createAmbulanceDto);

      expect(result).toEqual(mockAmbulance);
      expect(service.create).toHaveBeenCalledWith(createAmbulanceDto);
    });
  });

  describe('findAll', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return paginated ambulances', async () => {
      const mockPaginatedResult = {
        data: [mockAmbulance],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('findAvailable', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return available ambulances', async () => {
      const mockPaginatedResult = {
        data: [mockAmbulance],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findAvailable.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAvailable(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAvailable).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('findByDriver', () => {
    const driverId = 'user-123';

    it('should return ambulance by driver id', async () => {
      const ambulanceWithDriver = { ...mockAmbulance, driverId };
      service.findByDriver.mockResolvedValue(ambulanceWithDriver);

      const result = await controller.findByDriver(driverId);

      expect(result).toEqual(ambulanceWithDriver);
      expect(service.findByDriver).toHaveBeenCalledWith(driverId);
    });

    it('should return null when no ambulance found', async () => {
      service.findByDriver.mockResolvedValue(null);

      const result = await controller.findByDriver(driverId);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return an ambulance by id', async () => {
      service.findOne.mockResolvedValue(mockAmbulance);

      const result = await controller.findOne(ambulanceId);

      expect(result).toEqual(mockAmbulance);
      expect(service.findOne).toHaveBeenCalledWith(ambulanceId);
    });
  });

  describe('update', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';
    const updateAmbulanceDto: UpdateAmbulanceDto = {
      vehicleModel: 'Ford Transit',
    };

    it('should update an ambulance', async () => {
      const updatedAmbulance = { ...mockAmbulance, ...updateAmbulanceDto };
      service.update.mockResolvedValue(updatedAmbulance);

      const result = await controller.update(ambulanceId, updateAmbulanceDto);

      expect(result).toEqual(updatedAmbulance);
      expect(service.update).toHaveBeenCalledWith(
        ambulanceId,
        updateAmbulanceDto,
      );
    });
  });

  describe('updateLocation', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';
    const locationBody = { latitude: 42.8, longitude: 23.4 };

    it('should update ambulance location', async () => {
      const updatedAmbulance = { ...mockAmbulance, ...locationBody };
      service.updateLocation.mockResolvedValue(updatedAmbulance);

      const result = await controller.updateLocation(ambulanceId, locationBody);

      expect(result).toEqual(updatedAmbulance);
      expect(service.updateLocation).toHaveBeenCalledWith(
        ambulanceId,
        locationBody.latitude,
        locationBody.longitude,
      );
    });
  });

  describe('assignDriver', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should assign driver to ambulance', async () => {
      const assignDriverDto: AssignDriverDto = { driverId: 'user-123' };
      const ambulanceWithDriver = {
        ...mockAmbulance,
        driverId: assignDriverDto.driverId,
      };
      service.assignDriver.mockResolvedValue(ambulanceWithDriver);

      const result = await controller.assignDriver(
        ambulanceId,
        assignDriverDto,
      );

      expect(result).toEqual(ambulanceWithDriver);
      expect(service.assignDriver).toHaveBeenCalledWith(
        ambulanceId,
        assignDriverDto.driverId,
      );
    });

    it('should remove driver when driverId is not provided', async () => {
      const assignDriverDto: AssignDriverDto = { driverId: undefined };
      service.removeDriver.mockResolvedValue(mockAmbulance);

      const result = await controller.assignDriver(
        ambulanceId,
        assignDriverDto,
      );

      expect(result).toEqual(mockAmbulance);
      expect(service.removeDriver).toHaveBeenCalledWith(ambulanceId);
    });
  });

  describe('removeDriver', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove driver from ambulance', async () => {
      service.removeDriver.mockResolvedValue(mockAmbulance);

      const result = await controller.removeDriver(ambulanceId);

      expect(result).toEqual(mockAmbulance);
      expect(service.removeDriver).toHaveBeenCalledWith(ambulanceId);
    });
  });

  describe('markAsAvailable', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should mark ambulance as available', async () => {
      service.markAsAvailable.mockResolvedValue(mockAmbulance);

      const result = await controller.markAsAvailable(ambulanceId);

      expect(result).toEqual(mockAmbulance);
      expect(service.markAsAvailable).toHaveBeenCalledWith(ambulanceId);
    });
  });

  describe('markAsDispatched', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should mark ambulance as dispatched', async () => {
      const dispatchedAmbulance = { ...mockAmbulance, available: false };
      service.markAsDispatched.mockResolvedValue(dispatchedAmbulance);

      const result = await controller.markAsDispatched(ambulanceId);

      expect(result).toEqual(dispatchedAmbulance);
      expect(service.markAsDispatched).toHaveBeenCalledWith(ambulanceId);
    });
  });

  describe('remove', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete an ambulance', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(ambulanceId);

      expect(result).toEqual({ message: 'Ambulance deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(ambulanceId);
    });
  });
});
