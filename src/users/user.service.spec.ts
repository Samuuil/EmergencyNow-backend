import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { Role } from '../common/enums/role.enum';
import { paginate } from 'nestjs-paginate';

jest.mock('nestjs-paginate');

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'user-123',
    role: Role.USER,
    refreshToken: undefined,
    profile: null as any,
    contacts: [],
    calls: [],
    stateArchive: null as any,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      role: Role.USER,
      stateArchive: {
        egn: '1234567890',
        fullName: 'New User',
        email: 'new@example.com',
        phoneNumber: '+9876543210',
      },
    };

    it('should create a user successfully', async () => {
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith(createUserDto);
      expect(repository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      repository.create.mockReturnValue(mockUser);
      repository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    const userId = 'user-123';

    it('should find a user by id with relations', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['profile', 'contacts', 'calls', 'stateArchive'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      repository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users on success', async () => {
      const paginateMock = paginate as jest.Mock;
      const mockResult = { data: [mockUser], meta: {} };
      paginateMock.mockResolvedValue(mockResult);

      const result = await service.findAll({} as any);

      expect(result).toEqual(mockResult);
      expect(paginateMock).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const updateUserDto: UpdateUserDto = {
      fullName: 'Updated Name',
      phoneNumber: '+1111111111',
    };

    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on save error', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      repository.save.mockRejectedValue(new Error('Save error'));

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    const userId = 'user-123';

    it('should delete a user successfully', async () => {
      repository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.remove(userId);

      expect(repository.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.remove(userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on delete error', async () => {
      repository.delete.mockRejectedValue(new Error('Delete error'));

      await expect(service.remove(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByStateArchiveId', () => {
    const stateArchiveId = 'archive-123';

    it('should find user by state archive id', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByStateArchiveId(stateArchiveId);

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { stateArchive: { id: stateArchiveId } },
        relations: ['stateArchive', 'profile'],
      });
    });

    it('should return null when no user found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByStateArchiveId(stateArchiveId);

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      repository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.findByStateArchiveId(stateArchiveId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('updateRefreshToken', () => {
    const userId = 'user-123';
    const refreshToken = 'new-refresh-token';

    it('should update refresh token', async () => {
      repository.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await service.updateRefreshToken(userId, refreshToken);

      expect(repository.update).toHaveBeenCalledWith(userId, {
        refreshToken: refreshToken,
      });
    });

    it('should set refresh token to undefined when null provided', async () => {
      repository.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await service.updateRefreshToken(userId, null);

      expect(repository.update).toHaveBeenCalledWith(userId, {
        refreshToken: undefined,
      });
    });

    it('should throw InternalServerErrorException on update error', async () => {
      repository.update.mockRejectedValue(new Error('Update error'));

      await expect(
        service.updateRefreshToken(userId, refreshToken),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createWithExistingStateArchive', () => {
    const stateArchiveId = 'archive-123';

    it('should create user with existing state archive', async () => {
      const userWithArchive = {
        ...mockUser,
        stateArchive: { id: stateArchiveId } as any,
      };
      repository.create.mockReturnValue(userWithArchive);
      repository.save.mockResolvedValue(userWithArchive);

      const result =
        await service.createWithExistingStateArchive(stateArchiveId);

      expect(result).toEqual(userWithArchive);
      expect(repository.create).toHaveBeenCalledWith({
        role: Role.USER,
        stateArchive: { id: stateArchiveId },
      });
    });

    it('should create user with custom role', async () => {
      const userWithArchive = {
        ...mockUser,
        role: Role.DRIVER,
        stateArchive: { id: stateArchiveId } as any,
      };
      repository.create.mockReturnValue(userWithArchive);
      repository.save.mockResolvedValue(userWithArchive);

      const result = await service.createWithExistingStateArchive(
        stateArchiveId,
        Role.DRIVER,
      );

      expect(result).toEqual(userWithArchive);
      expect(repository.create).toHaveBeenCalledWith({
        role: Role.DRIVER,
        stateArchive: { id: stateArchiveId },
      });
    });

    it('should throw InternalServerErrorException on save error', async () => {
      repository.create.mockReturnValue(mockUser);
      repository.save.mockRejectedValue(new Error('Save error'));

      await expect(
        service.createWithExistingStateArchive(stateArchiveId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findUserRole', () => {
    const userId = 'user-123';

    it('should return user role', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserRole(userId);

      expect(result).toBe(Role.USER);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findUserRole(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      repository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findUserRole(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findUserEgn', () => {
    const userId = 'user-123';

    it('should return user EGN from state archive', async () => {
      const userWithArchive = {
        ...mockUser,
        stateArchive: { id: 'archive-123', egn: '1234567890' } as any,
      };
      repository.findOne.mockResolvedValue(userWithArchive);

      const result = await service.findUserEgn(userId);

      expect(result).toEqual({ egn: '1234567890' });
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findUserEgn(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when state archive not found', async () => {
      const userWithoutArchive = { ...mockUser, stateArchive: null as any };
      repository.findOne.mockResolvedValue(userWithoutArchive);

      await expect(service.findUserEgn(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when EGN not in state archive', async () => {
      const userWithArchiveNoEgn = {
        ...mockUser,
        stateArchive: { id: 'archive-123', egn: null } as any,
      };
      repository.findOne.mockResolvedValue(userWithArchiveNoEgn);

      await expect(service.findUserEgn(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      repository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findUserEgn(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
