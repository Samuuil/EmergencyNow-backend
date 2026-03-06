import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { Role } from '../common/enums/role.enum';
import { PaginateQuery } from 'nestjs-paginate';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockUser: User = {
    id: 'user-123',
    role: Role.USER,
    refreshToken: undefined,
    profile: null as any,
    contacts: [],
    calls: [],
    stateArchive: { id: 'archive-123', egn: '1234567890' } as any,
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findUserRole: jest.fn(),
    findUserEgn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should create a user', async () => {
      service.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return paginated users', async () => {
      const mockPaginatedResult = {
        data: [mockUser],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('findRole', () => {
    const userId = 'user-123';

    it('should return user role', async () => {
      service.findUserRole.mockResolvedValue(Role.USER);

      const result = await controller.findRole(userId);

      expect(result).toBe(Role.USER);
      expect(service.findUserRole).toHaveBeenCalledWith(userId);
    });
  });

  describe('findMyEgn', () => {
    it('should return current user EGN', async () => {
      service.findUserEgn.mockResolvedValue({ egn: '1234567890' });

      const result = await controller.findMyEgn(mockUser);

      expect(result).toEqual({ egn: '1234567890' });
      expect(service.findUserEgn).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findEgn', () => {
    const userId = 'user-456';

    it('should return user EGN by ID', async () => {
      service.findUserEgn.mockResolvedValue({ egn: '0987654321' });

      const result = await controller.findEgn(userId);

      expect(result).toEqual({ egn: '0987654321' });
      expect(service.findUserEgn).toHaveBeenCalledWith(userId);
    });
  });

  describe('findOne', () => {
    const userId = 'user-123';

    it('should return a user by ID', async () => {
      service.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(userId);

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const updateUserDto: UpdateUserDto = {
      fullName: 'Updated Name',
      phoneNumber: '+1111111111',
    };

    it('should update a user', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
    });
  });

  describe('remove', () => {
    const userId = 'user-123';

    it('should delete a user', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(userId);

      expect(result).toEqual({ message: 'User deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(userId);
    });
  });
});
