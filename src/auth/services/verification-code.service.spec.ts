import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { VerificationCodeService } from './verification-code.service';
import { RedisService } from '../../common/redis/redis.service';

describe('VerificationCodeService', () => {
  let service: VerificationCodeService;
  let redisService: jest.Mocked<RedisService>;

  const mockRedisService = {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    getdel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationCodeService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<VerificationCodeService>(VerificationCodeService);
    redisService = module.get(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCode', () => {
    it('should generate a 6-digit code', () => {
      const code = service.generateCode();

      expect(code).toMatch(/^\d{6}$/);
      expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code)).toBeLessThanOrEqual(999999);
    });

    it('should generate different codes', () => {
      const code1 = service.generateCode();
      const code2 = service.generateCode();
      const code3 = service.generateCode();

      // There's a tiny chance this could fail, but statistically very unlikely
      const codes = new Set([code1, code2, code3]);
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('saveCode', () => {
    const egn = '1234567890';
    const code = '123456';

    it('should save email verification code to Redis', async () => {
      redisService.setex.mockResolvedValue();

      await service.saveCode(egn, code, 'email');

      expect(redisService.setex).toHaveBeenCalledWith(
        'verify:email:1234567890',
        600,
        JSON.stringify({ code: '123456', method: 'email', egn: '1234567890' }),
      );
    });

    it('should save SMS verification code to Redis', async () => {
      redisService.setex.mockResolvedValue();

      await service.saveCode(egn, code, 'sms');

      expect(redisService.setex).toHaveBeenCalledWith(
        'verify:sms:1234567890',
        600,
        JSON.stringify({ code: '123456', method: 'sms', egn: '1234567890' }),
      );
    });

    it('should normalize EGN and code by trimming whitespace', async () => {
      redisService.setex.mockResolvedValue();

      await service.saveCode('  1234567890  ', '  123456  ', 'email');

      expect(redisService.setex).toHaveBeenCalledWith(
        'verify:email:1234567890',
        600,
        JSON.stringify({ code: '123456', method: 'email', egn: '1234567890' }),
      );
    });
  });

  describe('verifyAndConsumeCode', () => {
    const egn = '1234567890';
    const code = '123456';

    it('should verify and consume email verification code', async () => {
      const emailData = JSON.stringify({
        code: '123456',
        method: 'email',
        egn: '1234567890',
      });

      redisService.get.mockResolvedValueOnce(emailData);
      redisService.get.mockResolvedValueOnce(null);
      redisService.getdel.mockResolvedValue(emailData);

      const result = await service.verifyAndConsumeCode(egn, code);

      expect(result).toEqual({
        code: '123456',
        method: 'email',
        egn: '1234567890',
      });
      expect(redisService.getdel).toHaveBeenCalledWith('verify:email:1234567890');
    });

    it('should verify and consume SMS verification code', async () => {
      const smsData = JSON.stringify({
        code: '123456',
        method: 'sms',
        egn: '1234567890',
      });

      redisService.get.mockResolvedValueOnce(null);
      redisService.get.mockResolvedValueOnce(smsData);
      redisService.getdel.mockResolvedValue(smsData);

      const result = await service.verifyAndConsumeCode(egn, code);

      expect(result).toEqual({
        code: '123456',
        method: 'sms',
        egn: '1234567890',
      });
      expect(redisService.getdel).toHaveBeenCalledWith('verify:sms:1234567890');
    });

    it('should throw UnauthorizedException when code not found', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.verifyAndConsumeCode(egn, code)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyAndConsumeCode(egn, code)).rejects.toThrow(
        'Invalid or expired verification code',
      );
    });

    it('should throw UnauthorizedException when code does not match', async () => {
      const emailData = JSON.stringify({
        code: '654321',
        method: 'email',
        egn: '1234567890',
      });

      redisService.get.mockResolvedValue(emailData);

      await expect(service.verifyAndConsumeCode(egn, '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle invalid JSON gracefully', async () => {
      redisService.get.mockResolvedValueOnce('invalid-json');
      redisService.get.mockResolvedValueOnce('also-invalid');

      await expect(service.verifyAndConsumeCode(egn, code)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should normalize EGN and code before verification', async () => {
      const emailData = JSON.stringify({
        code: '123456',
        method: 'email',
        egn: '1234567890',
      });

      redisService.get.mockResolvedValueOnce(emailData);
      redisService.get.mockResolvedValueOnce(null);
      redisService.getdel.mockResolvedValue(emailData);

      const result = await service.verifyAndConsumeCode(
        '  1234567890  ',
        '  123456  ',
      );

      expect(result.egn).toBe('1234567890');
      expect(result.code).toBe('123456');
    });

    it('should throw UnauthorizedException when concurrent request already consumed the code', async () => {
      const emailData = JSON.stringify({
        code: '123456',
        method: 'email',
        egn: '1234567890',
      });

      redisService.get.mockResolvedValueOnce(emailData);
      redisService.get.mockResolvedValueOnce(null);
      redisService.getdel.mockResolvedValue(null);

      await expect(service.verifyAndConsumeCode(egn, code)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('hasActiveCode', () => {
    const egn = '1234567890';

    it('should return true when active email code exists', async () => {
      redisService.exists.mockResolvedValue(1);

      const result = await service.hasActiveCode(egn, 'email');

      expect(result).toBe(true);
      expect(redisService.exists).toHaveBeenCalledWith(
        'verify:email:1234567890',
      );
    });

    it('should return false when no code exists', async () => {
      redisService.exists.mockResolvedValue(0);

      const result = await service.hasActiveCode(egn, 'sms');

      expect(result).toBe(false);
      expect(redisService.exists).toHaveBeenCalledWith('verify:sms:1234567890');
    });
  });

  describe('getRemainingTTL', () => {
    const egn = '1234567890';

    it('should return remaining TTL for email code', async () => {
      redisService.ttl.mockResolvedValue(300);

      const result = await service.getRemainingTTL(egn, 'email');

      expect(result).toBe(300);
      expect(redisService.ttl).toHaveBeenCalledWith('verify:email:1234567890');
    });

    it('should return remaining TTL for SMS code', async () => {
      redisService.ttl.mockResolvedValue(150);

      const result = await service.getRemainingTTL(egn, 'sms');

      expect(result).toBe(150);
      expect(redisService.ttl).toHaveBeenCalledWith('verify:sms:1234567890');
    });

    it('should return -1 when key has no expiration', async () => {
      redisService.ttl.mockResolvedValue(-1);

      const result = await service.getRemainingTTL(egn, 'email');

      expect(result).toBe(-1);
    });

    it('should return -2 when key does not exist', async () => {
      redisService.ttl.mockResolvedValue(-2);

      const result = await service.getRemainingTTL(egn, 'email');

      expect(result).toBe(-2);
    });
  });

  describe('deleteCode', () => {
    const egn = '1234567890';

    it('should delete email verification code', async () => {
      redisService.del.mockResolvedValue(1);

      await service.deleteCode(egn, 'email');

      expect(redisService.del).toHaveBeenCalledWith('verify:email:1234567890');
    });

    it('should delete SMS verification code', async () => {
      redisService.del.mockResolvedValue(1);

      await service.deleteCode(egn, 'sms');

      expect(redisService.del).toHaveBeenCalledWith('verify:sms:1234567890');
    });
  });
});
