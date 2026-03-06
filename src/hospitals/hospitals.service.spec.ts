import { Test, TestingModule } from '@nestjs/testing';
import { HospitalsService } from './hospitals.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital } from './entities/hospital.entity';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  GoogleMapsService,
  Location,
} from '../common/services/google-maps.service';
import { paginate } from 'nestjs-paginate';

jest.mock('nestjs-paginate');

describe('HospitalsService', () => {
  let service: HospitalsService;
  let hospitalRepository: jest.Mocked<Repository<Hospital>>;
  let googleMapsService: jest.Mocked<GoogleMapsService>;

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

  const mockLocation: Location = {
    latitude: 42.6977,
    longitude: 23.3219,
  };

  const mockHospitalRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockGoogleMapsService = {
    getDistancesToMultipleDestinations: jest.fn(),
    findHospitalsByTextSearch: jest.fn(),
    getRoute: jest.fn(),
    getDistanceAndDuration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalsService,
        {
          provide: getRepositoryToken(Hospital),
          useValue: mockHospitalRepository,
        },
        {
          provide: GoogleMapsService,
          useValue: mockGoogleMapsService,
        },
      ],
    }).compile();

    service = module.get<HospitalsService>(HospitalsService);
    hospitalRepository = module.get(getRepositoryToken(Hospital));
    googleMapsService = module.get(GoogleMapsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

    it('should create a hospital successfully', async () => {
      hospitalRepository.create.mockReturnValue(mockHospital);
      hospitalRepository.save.mockResolvedValue(mockHospital);

      const result = await service.create(createHospitalDto);

      expect(result).toEqual(mockHospital);
      expect(hospitalRepository.create).toHaveBeenCalledWith(createHospitalDto);
      expect(hospitalRepository.save).toHaveBeenCalledWith(mockHospital);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      hospitalRepository.create.mockReturnValue(mockHospital);
      hospitalRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createHospitalDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    const mockQuery = {
      path: '',
    };

    it('should return paginated hospitals', async () => {
      const mockPaginatedResult = {
        data: [mockHospital],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };

      (paginate as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(paginate).toHaveBeenCalledWith(mockQuery, hospitalRepository, {
        sortableColumns: ['id', 'name', 'address', 'createdAt'],
        defaultSortBy: [['name', 'ASC']],
        searchableColumns: ['name', 'address'],
        filterableColumns: expect.any(Object),
        where: { isActive: true },
        defaultLimit: 10,
        maxLimit: 100,
      });
    });

    it('should throw InternalServerErrorException on paginate error', async () => {
      (paginate as jest.Mock).mockImplementation(() => {
        throw new Error('Pagination error');
      });

      await expect(service.findAll(mockQuery)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAllList', () => {
    it('should return list of active hospitals', async () => {
      hospitalRepository.find.mockResolvedValue([mockHospital]);

      const result = await service.findAllList();

      expect(result).toEqual([mockHospital]);
      expect(hospitalRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('should throw InternalServerErrorException on database error', async () => {
      hospitalRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.findAllList()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    const hospitalId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a hospital by id', async () => {
      hospitalRepository.findOne.mockResolvedValue(mockHospital);

      const result = await service.findOne(hospitalId);

      expect(result).toEqual(mockHospital);
      expect(hospitalRepository.findOne).toHaveBeenCalledWith({
        where: { id: hospitalId },
      });
    });

    it('should throw NotFoundException when hospital not found', async () => {
      hospitalRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(hospitalId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      hospitalRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(hospitalId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    const hospitalId = '123e4567-e89b-12d3-a456-426614174000';
    const updateHospitalDto = {
      name: 'Updated Hospital',
      phoneNumber: '+0987654321',
    };

    it('should update a hospital successfully', async () => {
      const updatedHospital = { ...mockHospital, ...updateHospitalDto };
      hospitalRepository.findOne.mockResolvedValue(mockHospital);
      hospitalRepository.save.mockResolvedValue(updatedHospital);

      const result = await service.update(hospitalId, updateHospitalDto);

      expect(result).toEqual(updatedHospital);
      expect(hospitalRepository.findOne).toHaveBeenCalledWith({
        where: { id: hospitalId },
      });
      expect(hospitalRepository.save).toHaveBeenCalledWith(updatedHospital);
    });

    it('should throw NotFoundException when hospital not found', async () => {
      hospitalRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(hospitalId, updateHospitalDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on update error', async () => {
      hospitalRepository.findOne.mockResolvedValue(mockHospital);
      hospitalRepository.save.mockRejectedValue(new Error('Update error'));

      await expect(
        service.update(hospitalId, updateHospitalDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    const hospitalId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove a hospital successfully', async () => {
      hospitalRepository.findOne.mockResolvedValue(mockHospital);
      hospitalRepository.remove.mockResolvedValue(mockHospital);

      await service.remove(hospitalId);

      expect(hospitalRepository.findOne).toHaveBeenCalledWith({
        where: { id: hospitalId },
      });
      expect(hospitalRepository.remove).toHaveBeenCalledWith(mockHospital);
    });

    it('should throw NotFoundException when hospital not found', async () => {
      hospitalRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(hospitalId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on delete error', async () => {
      hospitalRepository.findOne.mockResolvedValue(mockHospital);
      hospitalRepository.remove.mockRejectedValue(new Error('Delete error'));

      await expect(service.remove(hospitalId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findNearestHospitals', () => {
    const mockHospitals = [
      { ...mockHospital, id: '1', name: 'Hospital 1' },
      { ...mockHospital, id: '2', name: 'Hospital 2' },
      { ...mockHospital, id: '3', name: 'Hospital 3' },
    ];

    it('should return nearest hospitals sorted by distance', async () => {
      const mockDistances = [
        { distance: 5000, duration: 300 },
        { distance: 3000, duration: 180 },
        { distance: 8000, duration: 480 },
      ];

      hospitalRepository.find.mockResolvedValue(mockHospitals);
      googleMapsService.getDistancesToMultipleDestinations.mockResolvedValue(
        mockDistances,
      );

      const result = await service.findNearestHospitals(mockLocation, 3);

      expect(result).toHaveLength(3);
      expect(result[0].distance).toBe(3000);
      expect(result[1].distance).toBe(5000);
      expect(result[2].distance).toBe(8000);
      expect(
        googleMapsService.getDistancesToMultipleDestinations,
      ).toHaveBeenCalledWith(mockLocation, expect.any(Array));
    });

    it('should return empty array when no hospitals found', async () => {
      hospitalRepository.find.mockResolvedValue([]);

      const result = await service.findNearestHospitals(mockLocation);

      expect(result).toEqual([]);
    });

    it('should use fallback distances when Google Maps API fails', async () => {
      hospitalRepository.find.mockResolvedValue(mockHospitals);
      googleMapsService.getDistancesToMultipleDestinations.mockRejectedValue(
        new Error('API error'),
      );

      const result = await service.findNearestHospitals(mockLocation, 3);

      expect(result).toHaveLength(3);
      expect(result[0].distance).toBe(Infinity);
    });

    it('should limit results to specified limit', async () => {
      const mockDistances = [
        { distance: 5000, duration: 300 },
        { distance: 3000, duration: 180 },
        { distance: 8000, duration: 480 },
      ];

      hospitalRepository.find.mockResolvedValue(mockHospitals);
      googleMapsService.getDistancesToMultipleDestinations.mockResolvedValue(
        mockDistances,
      );

      const result = await service.findNearestHospitals(mockLocation, 2);

      expect(result).toHaveLength(2);
      expect(result[0].distance).toBe(3000);
      expect(result[1].distance).toBe(5000);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      hospitalRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.findNearestHospitals(mockLocation)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('syncHospitalsFromGooglePlaces', () => {
    const mockPlaces = [
      {
        name: 'New Hospital 1',
        address: '456 Oak St',
        location: { lat: 42.7, lng: 23.4 },
        placeId: 'ChIJ_new1',
      },
      {
        name: 'New Hospital 2',
        address: '789 Pine St',
        location: { lat: 42.8, lng: 23.5 },
        placeId: 'ChIJ_new2',
      },
    ];

    it('should sync hospitals from Google Places successfully', async () => {
      googleMapsService.findHospitalsByTextSearch.mockResolvedValue(mockPlaces);
      hospitalRepository.findOne.mockResolvedValue(null);
      hospitalRepository.create.mockImplementation((dto) => dto as Hospital);
      hospitalRepository.save.mockImplementation((hospital) =>
        Promise.resolve(hospital as Hospital),
      );

      await service.syncHospitalsFromGooglePlaces(mockLocation, 20000);

      expect(googleMapsService.findHospitalsByTextSearch).toHaveBeenCalledWith(
        mockLocation,
        20000,
      );
      expect(hospitalRepository.findOne).toHaveBeenCalledTimes(2);
      expect(hospitalRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should skip existing hospitals when syncing', async () => {
      const existingHospital = { ...mockHospital, placeId: 'ChIJ_new1' };
      googleMapsService.findHospitalsByTextSearch.mockResolvedValue(mockPlaces);
      hospitalRepository.findOne
        .mockResolvedValueOnce(existingHospital)
        .mockResolvedValueOnce(null);
      hospitalRepository.create.mockImplementation((dto) => dto as Hospital);
      hospitalRepository.save.mockImplementation((hospital) =>
        Promise.resolve(hospital as Hospital),
      );

      await service.syncHospitalsFromGooglePlaces(mockLocation);

      expect(hospitalRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should continue syncing even if individual hospital save fails', async () => {
      googleMapsService.findHospitalsByTextSearch.mockResolvedValue(mockPlaces);
      hospitalRepository.findOne.mockResolvedValue(null);
      hospitalRepository.create.mockImplementation((dto) => dto as Hospital);
      hospitalRepository.save
        .mockRejectedValueOnce(new Error('Save error'))
        .mockResolvedValueOnce(mockHospital);

      await service.syncHospitalsFromGooglePlaces(mockLocation);

      expect(hospitalRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should throw InternalServerErrorException when Google Places API fails', async () => {
      googleMapsService.findHospitalsByTextSearch.mockRejectedValue(
        new Error('API error'),
      );

      await expect(
        service.syncHospitalsFromGooglePlaces(mockLocation),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
