import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from './profile.controller';
import { ProfilesService } from './profile.service';
import { Profile } from './entities/profile.entity';
import { Gender } from '../common/enums/gender.enum';
import { BloodType } from '../common/enums/blood-type.enum';
import type { AuthenticatedUser } from '../common/types/auth.types';
import { PaginateQuery } from 'nestjs-paginate';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: jest.Mocked<ProfilesService>;

  const mockProfile: Profile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    height: 180,
    weight: 75,
    gender: Gender.MALE,
    allergies: ['peanuts'],
    dateOfBirth: new Date('1990-01-01'),
    bloodType: BloodType.A_POSITIVE,
    medicines: ['aspirin'],
    illnesses: ['none'],
    user: {} as any,
  };

  const mockUser: AuthenticatedUser = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'test@example.com',
    role: 'user' as any,
  };

  const mockProfilesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createOrUpdateForUser: jest.fn(),
    getProfileForUser: jest.fn(),
    getProfileByEgn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
    service = module.get(ProfilesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createProfileDto = {
      height: 180,
      weight: 75,
      gender: Gender.MALE,
      allergies: ['peanuts'],
      dateOfBirth: new Date('1990-01-01'),
      bloodType: BloodType.A_POSITIVE,
      medicines: ['aspirin'],
      illnesses: ['none'],
    };

    it('should create a profile', async () => {
      service.create.mockResolvedValue(mockProfile);

      const result = await controller.create(createProfileDto);

      expect(result).toEqual(mockProfile);
      expect(service.create).toHaveBeenCalledWith(createProfileDto);
    });
  });

  describe('findAll', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return all profiles', async () => {
      const mockPaginatedResult = {
        data: [mockProfile],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('getMyProfile', () => {
    it('should return the current user profile', async () => {
      service.getProfileForUser.mockResolvedValue(mockProfile);

      const result = await controller.getMyProfile(mockUser);

      expect(result).toEqual(mockProfile);
      expect(service.getProfileForUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('createMyProfile', () => {
    const createProfileDto = {
      height: 180,
      weight: 75,
      gender: Gender.MALE,
      allergies: ['peanuts'],
      dateOfBirth: new Date('1990-01-01'),
      bloodType: BloodType.A_POSITIVE,
      medicines: ['aspirin'],
      illnesses: ['none'],
    };

    it('should create profile for current user', async () => {
      service.createOrUpdateForUser.mockResolvedValue(mockProfile);

      const result = await controller.createMyProfile(
        mockUser,
        createProfileDto,
      );

      expect(result).toEqual(mockProfile);
      expect(service.createOrUpdateForUser).toHaveBeenCalledWith(
        mockUser.id,
        createProfileDto,
      );
    });
  });

  describe('updateMyProfile', () => {
    const updateProfileDto = {
      height: 185,
      weight: 80,
    };

    it('should update profile for current user (PUT)', async () => {
      const updatedProfile = { ...mockProfile, ...updateProfileDto };
      service.createOrUpdateForUser.mockResolvedValue(updatedProfile);

      const result = await controller.updateMyProfile(
        mockUser,
        updateProfileDto,
      );

      expect(result).toEqual(updatedProfile);
      expect(service.createOrUpdateForUser).toHaveBeenCalledWith(
        mockUser.id,
        updateProfileDto,
      );
    });
  });

  describe('patchMyProfile', () => {
    const updateProfileDto = {
      height: 185,
    };

    it('should partially update profile for current user (PATCH)', async () => {
      const updatedProfile = { ...mockProfile, ...updateProfileDto };
      service.createOrUpdateForUser.mockResolvedValue(updatedProfile);

      const result = await controller.patchMyProfile(
        mockUser,
        updateProfileDto,
      );

      expect(result).toEqual(updatedProfile);
      expect(service.createOrUpdateForUser).toHaveBeenCalledWith(
        mockUser.id,
        updateProfileDto,
      );
    });
  });

  describe('findOne', () => {
    const profileId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a profile by id', async () => {
      service.findOne.mockResolvedValue(mockProfile);

      const result = await controller.findOne(profileId);

      expect(result).toEqual(mockProfile);
      expect(service.findOne).toHaveBeenCalledWith(profileId);
    });
  });

  describe('getProfileByEgn', () => {
    const egn = '9001011234';

    it('should return a profile by EGN', async () => {
      service.getProfileByEgn.mockResolvedValue(mockProfile);

      const result = await controller.getProfileByEgn(egn);

      expect(result).toEqual(mockProfile);
      expect(service.getProfileByEgn).toHaveBeenCalledWith(egn);
    });
  });

  describe('update', () => {
    const profileId = '123e4567-e89b-12d3-a456-426614174000';
    const updateProfileDto = {
      height: 185,
      weight: 80,
    };

    it('should update a profile', async () => {
      const updatedProfile = { ...mockProfile, ...updateProfileDto };
      service.update.mockResolvedValue(updatedProfile);

      const result = await controller.update(profileId, updateProfileDto);

      expect(result).toEqual(updatedProfile);
      expect(service.update).toHaveBeenCalledWith(profileId, updateProfileDto);
    });
  });

  describe('remove', () => {
    const profileId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete a profile', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(profileId);

      expect(result).toEqual({ message: 'Profile deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(profileId);
    });
  });
});
