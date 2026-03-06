import { Test, TestingModule } from '@nestjs/testing';
import { StateArchiveController } from './state-archive.controller';
import { StateArchiveService } from './state-archive.service';
import { StateArchive } from './entities/state-archive.entity';
import { PaginateQuery } from 'nestjs-paginate';

describe('StateArchiveController', () => {
  let controller: StateArchiveController;
  let service: jest.Mocked<StateArchiveService>;

  const mockStateArchive: StateArchive = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    egn: '9001011234',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    user: null as any,
  };

  const mockStateArchiveService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByEgn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StateArchiveController],
      providers: [
        {
          provide: StateArchiveService,
          useValue: mockStateArchiveService,
        },
      ],
    }).compile();

    controller = module.get<StateArchiveController>(StateArchiveController);
    service = module.get(StateArchiveService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const mockQuery: PaginateQuery = {
      path: '',
    };

    it('should return all state archive entries', async () => {
      const mockPaginatedResult = {
        data: [mockStateArchive],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockPaginatedResult as any);

      const result = await controller.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('findOne', () => {
    const archiveId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a state archive entry by id', async () => {
      service.findOne.mockResolvedValue(mockStateArchive);

      const result = await controller.findOne(archiveId);

      expect(result).toEqual(mockStateArchive);
      expect(service.findOne).toHaveBeenCalledWith(archiveId);
    });
  });
});
