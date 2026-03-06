import { Test, TestingModule } from '@nestjs/testing';
import { StateArchiveService } from './state-archive.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StateArchive } from './entities/state-archive.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { paginate } from 'nestjs-paginate';

jest.mock('nestjs-paginate');

describe('StateArchiveService', () => {
  let service: StateArchiveService;
  let archiveRepo: jest.Mocked<Repository<StateArchive>>;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockStateArchive: StateArchive = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    egn: '9001011234',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    user: null as any,
  };

  const mockArchiveRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StateArchiveService,
        {
          provide: getRepositoryToken(StateArchive),
          useValue: mockArchiveRepo,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StateArchiveService>(StateArchiveService);
    archiveRepo = module.get(getRepositoryToken(StateArchive));
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      egn: '9001011234',
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+1234567890',
    };

    it('should create a state archive entry successfully', async () => {
      archiveRepo.findOne.mockResolvedValue(null);
      archiveRepo.create.mockReturnValue(mockStateArchive);
      archiveRepo.save.mockResolvedValue(mockStateArchive);

      const result = await service.create(createDto);

      expect(result).toEqual(mockStateArchive);
      expect(archiveRepo.findOne).toHaveBeenCalledWith({
        where: { egn: createDto.egn },
      });
      expect(archiveRepo.create).toHaveBeenCalledWith(createDto);
      expect(archiveRepo.save).toHaveBeenCalledWith(mockStateArchive);
    });

    it('should throw ConflictException when EGN already exists', async () => {
      archiveRepo.findOne.mockResolvedValue(mockStateArchive);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(archiveRepo.save).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      archiveRepo.findOne.mockResolvedValue(null);
      archiveRepo.create.mockReturnValue(mockStateArchive);
      archiveRepo.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    const mockQuery = {
      path: '',
    };

    it('should return paginated state archive entries', async () => {
      const mockPaginatedResult = {
        data: [mockStateArchive],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1 },
      };

      (paginate as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(mockQuery);

      expect(result).toEqual(mockPaginatedResult);
      expect(paginate).toHaveBeenCalledWith(mockQuery, archiveRepo, {
        sortableColumns: ['id', 'egn', 'fullName', 'email', 'phoneNumber'],
        defaultSortBy: [['fullName', 'ASC']],
        searchableColumns: ['egn', 'fullName', 'email', 'phoneNumber'],
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
    const archiveId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a state archive entry by id', async () => {
      archiveRepo.findOne.mockResolvedValue(mockStateArchive);

      const result = await service.findOne(archiveId);

      expect(result).toEqual(mockStateArchive);
      expect(archiveRepo.findOne).toHaveBeenCalledWith({
        where: { id: archiveId },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      archiveRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(archiveId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      archiveRepo.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(archiveId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    const archiveId = '123e4567-e89b-12d3-a456-426614174000';
    const updateDto = {
      fullName: 'Jane Doe',
      phoneNumber: '+0987654321',
    };

    it('should update a state archive entry successfully', async () => {
      const updatedArchive = { ...mockStateArchive, ...updateDto };
      archiveRepo.findOne.mockResolvedValue(mockStateArchive);
      archiveRepo.save.mockResolvedValue(updatedArchive);

      const result = await service.update(archiveId, updateDto);

      expect(result).toEqual(updatedArchive);
      expect(archiveRepo.save).toHaveBeenCalledWith(updatedArchive);
    });

    it('should throw NotFoundException when entry not found', async () => {
      archiveRepo.findOne.mockResolvedValue(null);

      await expect(service.update(archiveId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when updating to existing EGN', async () => {
      const existingArchive = {
        ...mockStateArchive,
        id: 'different-id',
        egn: '9002022345',
      };
      archiveRepo.findOne
        .mockResolvedValueOnce(mockStateArchive)
        .mockResolvedValueOnce(existingArchive);

      await expect(
        service.update(archiveId, { egn: '9002022345' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same EGN', async () => {
      const updatedArchive = { ...mockStateArchive, fullName: 'Jane Doe' };
      archiveRepo.findOne.mockResolvedValue(mockStateArchive);
      archiveRepo.save.mockResolvedValue(updatedArchive);

      const result = await service.update(archiveId, {
        egn: mockStateArchive.egn,
        fullName: 'Jane Doe',
      });

      expect(result).toBeDefined();
      expect(archiveRepo.save).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on update error', async () => {
      archiveRepo.findOne.mockResolvedValue(mockStateArchive);
      archiveRepo.save.mockRejectedValue(new Error('Update error'));

      await expect(service.update(archiveId, updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    const archiveId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove a state archive entry successfully', async () => {
      archiveRepo.findOne.mockResolvedValue(mockStateArchive);
      archiveRepo.remove.mockResolvedValue(mockStateArchive);

      await service.remove(archiveId);

      expect(archiveRepo.findOne).toHaveBeenCalledWith({
        where: { id: archiveId },
      });
      expect(archiveRepo.remove).toHaveBeenCalledWith(mockStateArchive);
    });

    it('should throw NotFoundException when entry not found', async () => {
      archiveRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(archiveId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on delete error', async () => {
      archiveRepo.findOne.mockResolvedValue(mockStateArchive);
      archiveRepo.remove.mockRejectedValue(new Error('Delete error'));

      await expect(service.remove(archiveId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByEgn', () => {
    const egn = '9001011234';

    it('should return entry from database if exists', async () => {
      archiveRepo.findOne.mockResolvedValue(mockStateArchive);

      const result = await service.findByEgn(egn);

      expect(result).toEqual(mockStateArchive);
      expect(archiveRepo.findOne).toHaveBeenCalledWith({ where: { egn } });
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('should fetch from external API and save when not in database', async () => {
      const externalData = {
        egn: '9001011234',
        fullName: 'External User',
        email: 'external@example.com',
        phoneNumber: '+1111111111',
      };

      const axiosResponse: AxiosResponse = {
        data: externalData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      archiveRepo.findOne.mockResolvedValueOnce(null);
      configService.get.mockReturnValue('http://external-api.com');
      httpService.get.mockReturnValue(of(axiosResponse));
      archiveRepo.create.mockReturnValue(mockStateArchive);
      archiveRepo.save.mockResolvedValue(mockStateArchive);

      const result = await service.findByEgn(egn);

      expect(result).toEqual(mockStateArchive);
      expect(httpService.get).toHaveBeenCalledWith(
        `http://external-api.com/state-archive-mock/egn/${egn}`,
      );
      expect(archiveRepo.create).toHaveBeenCalledWith({
        egn: externalData.egn,
        fullName: externalData.fullName,
        email: externalData.email,
        phoneNumber: externalData.phoneNumber,
      });
      expect(archiveRepo.save).toHaveBeenCalled();
    });

    it('should return null when external API returns null', async () => {
      const axiosResponse: AxiosResponse = {
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      archiveRepo.findOne.mockResolvedValue(null);
      configService.get.mockReturnValue('http://external-api.com');
      httpService.get.mockReturnValue(of(axiosResponse));

      const result = await service.findByEgn(egn);

      expect(result).toBeNull();
      expect(archiveRepo.save).not.toHaveBeenCalled();
    });

    it('should return null when external API returns 404', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not found',
      };

      archiveRepo.findOne.mockResolvedValue(null);
      configService.get.mockReturnValue('http://external-api.com');
      httpService.get.mockReturnValue(throwError(() => error));

      const result = await service.findByEgn(egn);

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException when STATE_ARCHIVE_URL not configured', async () => {
      archiveRepo.findOne.mockResolvedValue(null);
      configService.get.mockReturnValue(undefined);

      await expect(service.findByEgn(egn)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on external API error', async () => {
      const error = {
        response: { status: 500 },
        message: 'Server error',
      };

      archiveRepo.findOne.mockResolvedValue(null);
      configService.get.mockReturnValue('http://external-api.com');
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(service.findByEgn(egn)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      archiveRepo.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findByEgn(egn)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
