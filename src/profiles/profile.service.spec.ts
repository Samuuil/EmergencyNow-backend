import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profile.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { User } from '../users/entities/user.entity';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Gender } from '../common/enums/gender.enum';
import { BloodType } from '../common/enums/blood-type.enum';
import { paginate } from 'nestjs-paginate';

jest.mock('nestjs-paginate');

describe('ProfilesService', () => {
  let service: ProfilesService;
  let profileRepository: jest.Mocked<Repository<Profile>>;
  let userRepository: jest.Mocked<Repository<User>>;

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
    user: {} as User,
  };

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    profile: mockProfile,
  } as User;

  const mockProfileRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(Profile),
          useValue: mockProfileRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    profileRepository = module.get(getRepositoryToken(Profile));
    userRepository = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

    it('should create a profile successfully', async () => {
      profileRepository.create.mockReturnValue(mockProfile);
      profileRepository.save.mockResolvedValue(mockProfile);

      const result = await service.create(createProfileDto);

      expect(result).toEqual(mockProfile);
      expect(profileRepository.create).toHaveBeenCalledWith(createProfileDto);
      expect(profileRepository.save).toHaveBeenCalledWith(mockProfile);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      profileRepository.create.mockReturnValue(mockProfile);
      profileRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createProfileDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    const mockQuery = {
      path: '',
    };

    it('should return paginated profiles', async () => {
      const mockPaginatedResult = {
        data: [mockProfile],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };

      (paginate as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(paginate).toHaveBeenCalledWith(mockQuery, profileRepository, {
        sortableColumns: [
          'id',
          'height',
          'weight',
          'gender',
          'dateOfBirth',
          'bloodType',
        ],
        defaultSortBy: [['id', 'ASC']],
        searchableColumns: [],
        filterableColumns: expect.any(Object),
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

  describe('findOne', () => {
    const profileId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a profile by id', async () => {
      profileRepository.findOne.mockResolvedValue(mockProfile);

      const result = await service.findOne(profileId);

      expect(result).toEqual(mockProfile);
      expect(profileRepository.findOne).toHaveBeenCalledWith({
        where: { id: profileId },
      });
    });

    it('should throw NotFoundException when profile not found', async () => {
      profileRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(profileId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      profileRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(profileId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    const profileId = '123e4567-e89b-12d3-a456-426614174000';
    const updateProfileDto = {
      height: 185,
      weight: 80,
    };

    it('should update a profile successfully', async () => {
      const updatedProfile = { ...mockProfile, ...updateProfileDto };
      profileRepository.update.mockResolvedValue({ affected: 1 } as any);
      profileRepository.findOne.mockResolvedValue(updatedProfile);

      const result = await service.update(profileId, updateProfileDto);

      expect(result).toEqual(updatedProfile);
      expect(profileRepository.update).toHaveBeenCalledWith(
        profileId,
        updateProfileDto,
      );
    });

    it('should throw NotFoundException when profile not found during update', async () => {
      profileRepository.update.mockResolvedValue({ affected: 1 } as any);
      profileRepository.findOne.mockResolvedValue(null);

      await expect(service.update(profileId, updateProfileDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on update error', async () => {
      profileRepository.update.mockRejectedValue(new Error('Update error'));

      await expect(service.update(profileId, updateProfileDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    const profileId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove a profile successfully', async () => {
      profileRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(profileId);

      expect(profileRepository.delete).toHaveBeenCalledWith(profileId);
    });

    it('should throw NotFoundException when profile not found', async () => {
      profileRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(service.remove(profileId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on delete error', async () => {
      profileRepository.delete.mockRejectedValue(new Error('Delete error'));

      await expect(service.remove(profileId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('createOrUpdateForUser', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';
    const profileDto = {
      height: 180,
      weight: 75,
      gender: Gender.MALE,
      allergies: ['peanuts'],
      dateOfBirth: new Date('1990-01-01'),
      bloodType: BloodType.A_POSITIVE,
      medicines: ['aspirin'],
      illnesses: ['none'],
    };

    it('should create a new profile when user has no profile', async () => {
      const userWithoutProfile = { ...mockUser, profile: null };
      userRepository.findOne.mockResolvedValue(userWithoutProfile);
      profileRepository.create.mockReturnValue(mockProfile);
      profileRepository.save.mockResolvedValue(mockProfile);
      userRepository.save.mockResolvedValue({
        ...userWithoutProfile,
        profile: mockProfile,
      });

      const result = await service.createOrUpdateForUser(userId, profileDto);

      expect(result).toEqual(mockProfile);
      expect(profileRepository.create).toHaveBeenCalledWith(profileDto);
      expect(profileRepository.save).toHaveBeenCalledWith(mockProfile);
    });

    it('should update existing profile when user has profile', async () => {
      const updatedProfile = { ...mockProfile, height: 185 };
      userRepository.findOne.mockResolvedValue(mockUser);
      profileRepository.update.mockResolvedValue({ affected: 1 } as any);
      profileRepository.findOne.mockResolvedValue(updatedProfile);

      const result = await service.createOrUpdateForUser(userId, profileDto);

      expect(result).toEqual(updatedProfile);
      expect(profileRepository.update).toHaveBeenCalledWith(
        mockProfile.id,
        profileDto,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createOrUpdateForUser(userId, profileDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on error', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createOrUpdateForUser(userId, profileDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getProfileForUser', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174001';

    it('should return user profile', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfileForUser(userId);

      expect(result).toEqual(mockProfile);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['profile'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfileForUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user has no profile', async () => {
      const userWithoutProfile = { ...mockUser, profile: null };
      userRepository.findOne.mockResolvedValue(userWithoutProfile);

      await expect(service.getProfileForUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getProfileForUser(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getProfileByEgn', () => {
    const egn = '9001011234';

    it('should return profile by EGN', async () => {
      const userWithEgn = {
        ...mockUser,
        stateArchive: { egn: '9001011234' },
      };
      userRepository.findOne.mockResolvedValue(userWithEgn);

      const result = await service.getProfileByEgn(egn);

      expect(result).toEqual(mockProfile);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { stateArchive: { egn } },
        relations: ['profile', 'stateArchive'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfileByEgn(egn)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user has no profile', async () => {
      const userWithoutProfile = {
        ...mockUser,
        profile: null,
        stateArchive: { egn },
      };
      userRepository.findOne.mockResolvedValue(userWithoutProfile);

      await expect(service.getProfileByEgn(egn)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getProfileByEgn(egn)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
