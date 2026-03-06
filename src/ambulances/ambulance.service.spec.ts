import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AmbulancesService } from './ambulance.service';
import { Ambulance } from './entities/ambulance.entity';
import { User } from '../users/entities/user.entity';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { CreateAmbulanceDto } from './dtos/createAmbulance.dto';
import { UpdateAmbulanceDto } from './dtos/updateAmbulance.dto';

jest.mock('nestjs-paginate');

describe('AmbulancesService', () => {
  let service: AmbulancesService;
  let ambulanceRepository: jest.Mocked<Repository<Ambulance>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let googleMapsService: jest.Mocked<GoogleMapsService>;

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

  const mockUser: User = {
    id: 'user-123',
    role: 'DRIVER' as any,
    refreshToken: undefined,
    profile: null as any,
    contacts: [],
    calls: [],
    stateArchive: { id: 'archive-1' } as any,
  };

  const mockAmbulanceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
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
        AmbulancesService,
        {
          provide: getRepositoryToken(Ambulance),
          useValue: mockAmbulanceRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: GoogleMapsService,
          useValue: mockGoogleMapsService,
        },
      ],
    }).compile();

    service = module.get<AmbulancesService>(AmbulancesService);
    ambulanceRepository = module.get(getRepositoryToken(Ambulance));
    userRepository = module.get(getRepositoryToken(User));
    googleMapsService = module.get(GoogleMapsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createAmbulanceDto: CreateAmbulanceDto = {
      licensePlate: 'ABC-1234',
      vehicleModel: 'Mercedes Sprinter',
    };

    it('should create an ambulance successfully', async () => {
      ambulanceRepository.findOne.mockResolvedValue(null);
      ambulanceRepository.create.mockReturnValue(mockAmbulance);
      ambulanceRepository.save.mockResolvedValue(mockAmbulance);

      const result = await service.create(createAmbulanceDto);

      expect(result).toEqual(mockAmbulance);
      expect(ambulanceRepository.findOne).toHaveBeenCalledWith({
        where: { licensePlate: createAmbulanceDto.licensePlate },
      });
      expect(ambulanceRepository.create).toHaveBeenCalledWith({
        ...createAmbulanceDto,
        driverId: null,
        available: true,
      });
      expect(ambulanceRepository.save).toHaveBeenCalled();
    });

    it('should create an ambulance with driver', async () => {
      const driverId = 'user-123';
      ambulanceRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser);
      ambulanceRepository.create.mockReturnValue({
        ...mockAmbulance,
        driverId,
      });
      ambulanceRepository.save.mockResolvedValue({
        ...mockAmbulance,
        driverId,
      });

      const result = await service.create(createAmbulanceDto, driverId);

      expect(result.driverId).toBe(driverId);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: driverId },
      });
    });

    it('should throw ConflictException if ambulance already exists', async () => {
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);

      await expect(service.create(createAmbulanceDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if driver not found', async () => {
      const driverId = 'invalid-driver-id';
      ambulanceRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createAmbulanceDto, driverId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      ambulanceRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createAmbulanceDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should find an ambulance by id', async () => {
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);

      const result = await service.findOne(ambulanceId);

      expect(result).toEqual(mockAmbulance);
      expect(ambulanceRepository.findOne).toHaveBeenCalledWith({
        where: { id: ambulanceId },
      });
    });

    it('should throw NotFoundException when ambulance not found', async () => {
      ambulanceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(ambulanceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      ambulanceRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne(ambulanceId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';
    const updateAmbulanceDto: UpdateAmbulanceDto = {
      vehicleModel: 'Ford Transit',
    };

    it('should update an ambulance successfully', async () => {
      const updatedAmbulance = { ...mockAmbulance, ...updateAmbulanceDto };
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      ambulanceRepository.save.mockResolvedValue(updatedAmbulance);

      const result = await service.update(ambulanceId, updateAmbulanceDto);

      expect(result).toEqual(updatedAmbulance);
      expect(ambulanceRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to existing license plate', async () => {
      const updateDto = { licensePlate: 'XYZ-9999' };
      const existingAmbulance = { ...mockAmbulance, id: 'different-id' };

      ambulanceRepository.findOne
        .mockResolvedValueOnce(mockAmbulance)
        .mockResolvedValueOnce(existingAmbulance);

      await expect(service.update(ambulanceId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when driver not found', async () => {
      const updateDto = { driverId: 'invalid-driver-id' };
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update(ambulanceId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on update error', async () => {
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      ambulanceRepository.save.mockRejectedValue(new Error('Update error'));

      await expect(
        service.update(ambulanceId, updateAmbulanceDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove an ambulance successfully', async () => {
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      ambulanceRepository.remove.mockResolvedValue(mockAmbulance);

      await service.remove(ambulanceId);

      expect(ambulanceRepository.remove).toHaveBeenCalledWith(mockAmbulance);
    });

    it('should throw NotFoundException when ambulance not found', async () => {
      ambulanceRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(ambulanceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on delete error', async () => {
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      ambulanceRepository.remove.mockRejectedValue(new Error('Delete error'));

      await expect(service.remove(ambulanceId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAvailableList', () => {
    it('should return list of available ambulances', async () => {
      const availableAmbulances = [mockAmbulance];
      ambulanceRepository.find.mockResolvedValue(availableAmbulances);

      const result = await service.findAvailableList();

      expect(result).toEqual(availableAmbulances);
      expect(ambulanceRepository.find).toHaveBeenCalledWith({
        where: { available: true },
      });
    });

    it('should throw InternalServerErrorException on error', async () => {
      ambulanceRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.findAvailableList()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findNearestAvailableAmbulance', () => {
    const location = { latitude: 42.7, longitude: 23.3 };

    it('should find nearest available ambulance', async () => {
      const ambulances = [
        { ...mockAmbulance, latitude: 42.69, longitude: 23.32 },
        { ...mockAmbulance, id: 'amb-2', latitude: 42.8, longitude: 23.5 },
        { ...mockAmbulance, id: 'amb-3', latitude: 42.71, longitude: 23.33 },
      ];
      ambulanceRepository.find.mockResolvedValue(ambulances);
      googleMapsService.getDistancesToMultipleDestinations.mockResolvedValue([
        { distance: 3000, duration: 300 },
        { distance: 5000, duration: 600 },
        { distance: 2500, duration: 250 },
      ]);

      const result = await service.findNearestAvailableAmbulance(location);

      expect(result).toBeDefined();
      expect(result!.id).toBe('amb-3');
      expect(result!.distance).toBe(2500);
      expect(result!.duration).toBe(250);
      expect(
        googleMapsService.getDistancesToMultipleDestinations,
      ).toHaveBeenCalledWith(location, expect.any(Array));
    });

    it('should return null when no available ambulances', async () => {
      ambulanceRepository.find.mockResolvedValue([]);

      const result = await service.findNearestAvailableAmbulance(location);

      expect(result).toBeNull();
    });

    it('should return null when ambulances have no location data', async () => {
      const ambulances = [
        { ...mockAmbulance, latitude: null, longitude: null },
        { ...mockAmbulance, id: 'amb-2', latitude: null, longitude: 23.5 },
      ] as any;
      ambulanceRepository.find.mockResolvedValue(ambulances);

      const result = await service.findNearestAvailableAmbulance(location);

      expect(result).toBeNull();
    });
  });

  describe('findNearestAvailableAmbulanceExcluding', () => {
    const location = { latitude: 42.7, longitude: 23.3 };

    it('should find nearest ambulance excluding specified IDs', async () => {
      const ambulances = [
        { ...mockAmbulance, id: 'amb-1', latitude: 42.69, longitude: 23.32 },
        { ...mockAmbulance, id: 'amb-2', latitude: 42.8, longitude: 23.5 },
        { ...mockAmbulance, id: 'amb-3', latitude: 42.71, longitude: 23.33 },
      ];
      ambulanceRepository.find.mockResolvedValue(ambulances);
      googleMapsService.getDistancesToMultipleDestinations.mockResolvedValue([
        { distance: 5000, duration: 600 },
        { distance: 2500, duration: 250 },
      ]);

      const result = await service.findNearestAvailableAmbulanceExcluding(
        location,
        ['amb-1'],
      );

      expect(result).toBeDefined();
      expect(result!.id).toBe('amb-3');
      expect(result!.distance).toBe(2500);
      expect(result!.duration).toBe(250);
    });

    it('should return null when all ambulances are excluded', async () => {
      const ambulances = [
        { ...mockAmbulance, id: 'amb-1', latitude: 42.69, longitude: 23.32 },
      ];
      ambulanceRepository.find.mockResolvedValue(ambulances);

      const result = await service.findNearestAvailableAmbulanceExcluding(
        location,
        ['amb-1'],
      );

      expect(result).toBeNull();
    });

    it('should return null when no ambulances with location data', async () => {
      const ambulances = [
        { ...mockAmbulance, id: 'amb-1', latitude: null, longitude: null },
      ] as any;
      ambulanceRepository.find.mockResolvedValue(ambulances);

      const result = await service.findNearestAvailableAmbulanceExcluding(
        location,
        [],
      );

      expect(result).toBeNull();
    });
  });

  describe('markAsDispatched', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should mark ambulance as dispatched', async () => {
      const dispatchedAmbulance = { ...mockAmbulance, available: false };
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      ambulanceRepository.save.mockResolvedValue(dispatchedAmbulance);

      const result = await service.markAsDispatched(ambulanceId);

      expect(result.available).toBe(false);
      expect(ambulanceRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when ambulance not found', async () => {
      ambulanceRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsDispatched(ambulanceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsAvailable', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should mark ambulance as available', async () => {
      const unavailableAmbulance = { ...mockAmbulance, available: false };
      const availableAmbulance = { ...mockAmbulance, available: true };
      ambulanceRepository.findOne.mockResolvedValue(unavailableAmbulance);
      ambulanceRepository.save.mockResolvedValue(availableAmbulance);

      const result = await service.markAsAvailable(ambulanceId);

      expect(result.available).toBe(true);
      expect(ambulanceRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateLocation', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';
    const latitude = 42.8;
    const longitude = 23.4;

    it('should update ambulance location', async () => {
      const updatedAmbulance = { ...mockAmbulance, latitude, longitude };
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      ambulanceRepository.save.mockResolvedValue(updatedAmbulance);

      const result = await service.updateLocation(
        ambulanceId,
        latitude,
        longitude,
      );

      expect(result.latitude).toBe(latitude);
      expect(result.longitude).toBe(longitude);
    });

    it('should throw InternalServerErrorException on update error', async () => {
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      ambulanceRepository.save.mockRejectedValue(new Error('Update error'));

      await expect(
        service.updateLocation(ambulanceId, latitude, longitude),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('assignDriver', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';
    const driverId = 'user-123';

    it('should assign driver to ambulance', async () => {
      ambulanceRepository.findOne
        .mockResolvedValueOnce(mockAmbulance)
        .mockResolvedValueOnce(null);
      userRepository.findOne.mockResolvedValue(mockUser);
      ambulanceRepository.save.mockResolvedValue({
        ...mockAmbulance,
        driverId,
      });

      const result = await service.assignDriver(ambulanceId, driverId);

      expect(result.driverId).toBe(driverId);
      expect(ambulanceRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when driver not found', async () => {
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.assignDriver(ambulanceId, driverId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when driver already assigned to another ambulance', async () => {
      const otherAmbulance = { ...mockAmbulance, id: 'other-id', driverId };
      ambulanceRepository.findOne
        .mockResolvedValueOnce(mockAmbulance)
        .mockResolvedValueOnce(otherAmbulance);
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.assignDriver(ambulanceId, driverId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      ambulanceRepository.findOne.mockResolvedValueOnce(mockAmbulance);
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.assignDriver(ambulanceId, driverId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('removeDriver', () => {
    const ambulanceId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove driver from ambulance', async () => {
      const ambulanceWithDriver = { ...mockAmbulance, driverId: 'user-123' };
      ambulanceRepository.findOne.mockResolvedValue(ambulanceWithDriver);
      ambulanceRepository.save.mockResolvedValue({
        ...ambulanceWithDriver,
        driverId: null,
      });

      const result = await service.removeDriver(ambulanceId);

      expect(result.driverId).toBeNull();
      expect(ambulanceRepository.save).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on save error', async () => {
      ambulanceRepository.findOne.mockResolvedValue(mockAmbulance);
      ambulanceRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.removeDriver(ambulanceId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByDriver', () => {
    const driverId = 'user-123';

    it('should find ambulance by driver id', async () => {
      const ambulanceWithDriver = { ...mockAmbulance, driverId };
      ambulanceRepository.findOne.mockResolvedValue(ambulanceWithDriver);

      const result = await service.findByDriver(driverId);

      expect(result).toEqual(ambulanceWithDriver);
      expect(ambulanceRepository.findOne).toHaveBeenCalledWith({
        where: { driverId },
      });
    });

    it('should return null when no ambulance found for driver', async () => {
      ambulanceRepository.findOne.mockResolvedValue(null);

      const result = await service.findByDriver(driverId);

      expect(result).toBeNull();
    });
  });

  describe('bulkUpdateLocations', () => {
    it('should update multiple ambulance locations', async () => {
      const updates = [
        { ambulanceId: 'amb-1', latitude: 42.7, longitude: 23.3 },
        { ambulanceId: 'amb-2', latitude: 42.8, longitude: 23.4 },
      ];
      ambulanceRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.bulkUpdateLocations(updates);

      expect(ambulanceRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should handle empty updates array', async () => {
      await service.bulkUpdateLocations([]);

      expect(ambulanceRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('removeInactiveDrivers', () => {
    it('should remove inactive drivers from ambulances', async () => {
      const inactiveAmbulances = [
        {
          ...mockAmbulance,
          driverId: 'driver-1',
          lastCallAcceptedAt: new Date('2020-01-01'),
        },
        {
          ...mockAmbulance,
          id: 'amb-2',
          driverId: 'driver-2',
          lastCallAcceptedAt: null,
        },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(inactiveAmbulances),
      };

      ambulanceRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );
      ambulanceRepository.save.mockResolvedValue(mockAmbulance);

      const result = await service.removeInactiveDrivers(5);

      expect(result).toHaveLength(2);
      expect(result).toContain('driver-1');
      expect(result).toContain('driver-2');
      expect(ambulanceRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDriverIdToAmbulanceIdMap', () => {
    it('should create map of driver IDs to ambulance IDs', async () => {
      const ambulances = [
        {
          ...mockAmbulance,
          id: 'amb-1',
          driverId: 'driver-1',
          available: true,
        },
        {
          ...mockAmbulance,
          id: 'amb-2',
          driverId: 'driver-2',
          available: true,
        },
        { ...mockAmbulance, id: 'amb-3', driverId: null, available: true },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(ambulances),
      };

      ambulanceRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      const result = await service.getDriverIdToAmbulanceIdMap();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('driver-1')).toBe('amb-1');
      expect(result.get('driver-2')).toBe('amb-2');
      expect(result.has('driver-3')).toBe(false);
    });
  });
});
