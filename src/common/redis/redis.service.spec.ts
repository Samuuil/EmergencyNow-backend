import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockRedisClient = {
      setex: jest.fn(),
      get: jest.fn(),
      getdel: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    } as any;

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    mockConfigService.get.mockReturnValue('redis://localhost:6379');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should be initialized with event handlers', () => {
      expect(service).toBeDefined();
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('should log on successful connection', () => {
      const connectHandler = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];

      // Trigger the connect event
      if (connectHandler) {
        connectHandler();
      }
    });

    it('should log on connection error', () => {
      const errorHandler = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1];

      // Trigger the error event
      if (errorHandler) {
        errorHandler(new Error('Connection failed'));
      }
    });
  });

  describe('setex', () => {
    it('should set key with expiration', async () => {
      const key = 'test-key';
      const seconds = 300;
      const value = 'test-value';

      mockRedisClient.setex.mockResolvedValue('OK');

      await service.setex(key, seconds, value);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(key, seconds, value);
    });
  });

  describe('get', () => {
    it('should get value by key', async () => {
      const key = 'test-key';
      const value = 'test-value';

      mockRedisClient.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toBe(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null when key does not exist', async () => {
      const key = 'non-existent-key';

      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });

  describe('getdel', () => {
    it('should get and delete value by key', async () => {
      const key = 'test-key';
      const value = 'test-value';

      mockRedisClient.getdel.mockResolvedValue(value);

      const result = await service.getdel(key);

      expect(result).toBe(value);
      expect(mockRedisClient.getdel).toHaveBeenCalledWith(key);
    });

    it('should return null when key does not exist', async () => {
      const key = 'non-existent-key';

      mockRedisClient.getdel.mockResolvedValue(null);

      const result = await service.getdel(key);

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete key and return count of deleted keys', async () => {
      const key = 'test-key';

      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.del(key);

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should return 0 when key does not exist', async () => {
      const key = 'non-existent-key';

      mockRedisClient.del.mockResolvedValue(0);

      const result = await service.del(key);

      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return 1 when key exists', async () => {
      const key = 'test-key';

      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists(key);

      expect(result).toBe(1);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
    });

    it('should return 0 when key does not exist', async () => {
      const key = 'non-existent-key';

      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists(key);

      expect(result).toBe(0);
    });
  });

  describe('ttl', () => {
    it('should return TTL in seconds', async () => {
      const key = 'test-key';
      const ttl = 300;

      mockRedisClient.ttl.mockResolvedValue(ttl);

      const result = await service.ttl(key);

      expect(result).toBe(ttl);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith(key);
    });

    it('should return -1 when key exists but has no expiration', async () => {
      const key = 'persistent-key';

      mockRedisClient.ttl.mockResolvedValue(-1);

      const result = await service.ttl(key);

      expect(result).toBe(-1);
    });

    it('should return -2 when key does not exist', async () => {
      const key = 'non-existent-key';

      mockRedisClient.ttl.mockResolvedValue(-2);

      const result = await service.ttl(key);

      expect(result).toBe(-2);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis connection on module destroy', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
