import { Test, TestingModule } from '@nestjs/testing';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService, HospitalWithDistance } from './hospitals.service';
import { Hospital } from './entities/hospital.entity';
import { PaginateQuery } from 'nestjs-paginate';

describe('HospitalsController', () => {
  let controller: HospitalsController;
  let service: jest.Mocked<HospitalsService>;

  const mockHospital: Hospital = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'City Hospital',
    address: '123 Main St',
    latitude: 42.6977,
    longitude: 23.3219,
    phoneNumber: '+1234567890',
    placeId: 'ChIJ123abc',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  };

  const mockHospitalWithDistance: HospitalWithDistance = {
    ...mockHospital,
    distance: 5000,
    duration: 300,
  };

  const mockHospitalsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllList: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findNearestHospitals: jest.fn(),
    syncHospitalsFromGooglePlaces: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HospitalsController],
      providers: [
        {
          provide: HospitalsService,
          useValue: mockHospitalsService,
        },
      ],
    }).compile();

    controller = module.get<HospitalsController>(HospitalsController);
    service = module.get(HospitalsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createHospitalDto = {
      name: 'City Hospital',
      address: '123 Main St',
      latitude: 42.6977,
      longitude: 23.3219,
      phoneNumber: '+1234567890',
      placeId: 'ChIJ123abc',
      isActive: true,
    };

    it('should create a hospital', async () => {
      service.create.mockResolvedValue(mockHospital);

      const result = await controller.create(createHospitalDto);

      expect(result).toEqual(mockHospital);
      expect(service.create).toHaveBeenCalledWith(createHospitalDto);
    });
  });

  describe('findAll', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return all hospitals', async () => {
      const mockPaginatedResult = {
        data: [mockHospital],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('findNearest', () => {
    it('should return nearest hospitals with default limit', async () => {
      service.findNearestHospitals.mockResolvedValue([
        mockHospitalWithDistance,
      ]);

      const result = await controller.findNearest('42.6977', '23.3219');

      expect(result).toEqual([mockHospitalWithDistance]);
      expect(service.findNearestHospitals).toHaveBeenCalledWith(
        { latitude: 42.6977, longitude: 23.3219 },
        10,
      );
    });

    it('should return nearest hospitals with custom limit', async () => {
      service.findNearestHospitals.mockResolvedValue([
        mockHospitalWithDistance,
      ]);

      const result = await controller.findNearest('42.6977', '23.3219', '5');

      expect(result).toEqual([mockHospitalWithDistance]);
      expect(service.findNearestHospitals).toHaveBeenCalledWith(
        { latitude: 42.6977, longitude: 23.3219 },
        5,
      );
    });

    it('should parse coordinates correctly', async () => {
      service.findNearestHospitals.mockResolvedValue([]);

      await controller.findNearest('40.7128', '-74.0060', '3');

      expect(service.findNearestHospitals).toHaveBeenCalledWith(
        { latitude: 40.7128, longitude: -74.006 },
        3,
      );
    });
  });

  describe('findOne', () => {
    const hospitalId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a hospital by id', async () => {
      service.findOne.mockResolvedValue(mockHospital);

      const result = await controller.findOne(hospitalId);

      expect(result).toEqual(mockHospital);
      expect(service.findOne).toHaveBeenCalledWith(hospitalId);
    });
  });

  describe('update', () => {
    const hospitalId = '123e4567-e89b-12d3-a456-426614174000';
    const updateHospitalDto = {
      name: 'Updated Hospital',
      phoneNumber: '+0987654321',
    };

    it('should update a hospital', async () => {
      const updatedHospital = { ...mockHospital, ...updateHospitalDto };
      service.update.mockResolvedValue(updatedHospital);

      const result = await controller.update(hospitalId, updateHospitalDto);

      expect(result).toEqual(updatedHospital);
      expect(service.update).toHaveBeenCalledWith(
        hospitalId,
        updateHospitalDto,
      );
    });
  });

  describe('remove', () => {
    const hospitalId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete a hospital', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(hospitalId);

      expect(result).toEqual({ message: 'Hospital deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(hospitalId);
    });
  });

  describe('syncFromGooglePlaces', () => {
    it('should sync hospitals from Google Places with default radius', async () => {
      const body = { latitude: 42.6977, longitude: 23.3219 };
      service.syncHospitalsFromGooglePlaces.mockResolvedValue(undefined);

      const result = await controller.syncFromGooglePlaces(body);

      expect(result).toEqual({ message: 'Hospitals synced successfully' });
      expect(service.syncHospitalsFromGooglePlaces).toHaveBeenCalledWith(
        { latitude: 42.6977, longitude: 23.3219 },
        undefined,
      );
    });

    it('should sync hospitals from Google Places with custom radius', async () => {
      const body = { latitude: 42.6977, longitude: 23.3219, radius: 50000 };
      service.syncHospitalsFromGooglePlaces.mockResolvedValue(undefined);

      const result = await controller.syncFromGooglePlaces(body);

      expect(result).toEqual({ message: 'Hospitals synced successfully' });
      expect(service.syncHospitalsFromGooglePlaces).toHaveBeenCalledWith(
        { latitude: 42.6977, longitude: 23.3219 },
        50000,
      );
    });
  });
});
