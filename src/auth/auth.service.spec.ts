import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/user.service';
import { StateArchiveService } from '../state-archive/state-archive.service';
import { MailService } from './services/mail.service';
import { SmsService } from './services/sms.service';
import { VerificationCodeService } from './services/verification-code.service';
import { InitiateLoginDto, LoginMethod } from './dto/initiate-login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RedisService } from '../common/redis/redis.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let stateArchiveService: jest.Mocked<StateArchiveService>;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;
  let smsService: jest.Mocked<SmsService>;
  let configService: jest.Mocked<ConfigService>;
  let verificationCodeService: jest.Mocked<VerificationCodeService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUsersService = {
    findByStateArchiveId: jest.fn(),
    createWithExistingStateArchive: jest.fn(),
    findOne: jest.fn(),
  };

  const mockStateArchiveService = {
    findByEgn: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockMailService = {
    sendVerificationCode: jest.fn(),
  };

  const mockSmsService = {
    sendVerificationCode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockVerificationCodeService = {
    generateCode: jest.fn(),
    saveCode: jest.fn(),
    verifyAndConsumeCode: jest.fn(),
  };

  const mockRedisService = {
    addRefreshToken: jest.fn(),
    getRefreshToken: jest.fn(),
    removeRefreshToken: jest.fn(),
  };

  const mockStateArchive = {
    id: 'archive-123',
    egn: '1234567890',
    fullName: 'Test User',
    email: 'test@example.com',
    phoneNumber: '+1234567890',
  };

  const mockUser = {
    id: 'user-123',
    role: 'USER',
    stateArchive: mockStateArchive,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: StateArchiveService,
          useValue: mockStateArchiveService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: VerificationCodeService,
          useValue: mockVerificationCodeService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    stateArchiveService = module.get(StateArchiveService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
    smsService = module.get(SmsService);
    configService = module.get(ConfigService);
    verificationCodeService = module.get(VerificationCodeService);
    redisService = module.get(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateLogin', () => {
    const initiateLoginDto: InitiateLoginDto = {
      egn: '1234567890',
      method: LoginMethod.EMAIL,
    };

    it('should send verification code via email', async () => {
      stateArchiveService.findByEgn.mockResolvedValue(mockStateArchive as any);
      verificationCodeService.generateCode.mockReturnValue('123456');
      verificationCodeService.saveCode.mockResolvedValue();
      mailService.sendVerificationCode.mockResolvedValue();

      const result = await service.initiateLogin(initiateLoginDto);

      expect(result).toEqual({
        message: 'Verification code sent to your email',
      });
      expect(stateArchiveService.findByEgn).toHaveBeenCalledWith('1234567890');
      expect(verificationCodeService.generateCode).toHaveBeenCalled();
      expect(verificationCodeService.saveCode).toHaveBeenCalledWith(
        '1234567890',
        '123456',
        LoginMethod.EMAIL,
      );
      expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        'Test User',
      );
    });

    it('should send verification code via SMS', async () => {
      const smsDto: InitiateLoginDto = {
        egn: '1234567890',
        method: LoginMethod.SMS,
      };

      stateArchiveService.findByEgn.mockResolvedValue(mockStateArchive as any);
      verificationCodeService.generateCode.mockReturnValue('123456');
      verificationCodeService.saveCode.mockResolvedValue();
      smsService.sendVerificationCode.mockResolvedValue();

      const result = await service.initiateLogin(smsDto);

      expect(result).toEqual({
        message: 'Verification code sent to your phone',
      });
      expect(smsService.sendVerificationCode).toHaveBeenCalledWith(
        '+1234567890',
        '123456',
        'Test User',
      );
    });

    it('should throw NotFoundException when user not in state archive', async () => {
      stateArchiveService.findByEgn.mockResolvedValue(null);

      await expect(service.initiateLogin(initiateLoginDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.initiateLogin(initiateLoginDto)).rejects.toThrow(
        'User not found in state archive',
      );
    });
  });

  describe('verifyCode', () => {
    const verifyCodeDto: VerifyCodeDto = {
      egn: '1234567890',
      code: '123456',
    };

    it('should verify code and return tokens for existing user', async () => {
      verificationCodeService.verifyAndConsumeCode.mockResolvedValue({
        code: '123456',
        method: 'email',
        egn: '1234567890',
      });
      stateArchiveService.findByEgn.mockResolvedValue(mockStateArchive as any);
      usersService.findByStateArchiveId.mockResolvedValue(mockUser as any);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      configService.get.mockReturnValue('test-secret');
      redisService.addRefreshToken.mockResolvedValue('refresh-token');

      const result = await service.verifyCode(verifyCodeDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(verificationCodeService.verifyAndConsumeCode).toHaveBeenCalledWith(
        '1234567890',
        '123456',
      );
      expect(usersService.findByStateArchiveId).toHaveBeenCalledWith(
        'archive-123',
      );
    });

    it('should create new user if not exists', async () => {
      verificationCodeService.verifyAndConsumeCode.mockResolvedValue({
        code: '123456',
        method: 'email',
        egn: '1234567890',
      });
      stateArchiveService.findByEgn.mockResolvedValue(mockStateArchive as any);
      usersService.findByStateArchiveId.mockResolvedValue(null);
      usersService.createWithExistingStateArchive.mockResolvedValue(
        mockUser as any,
      );
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      configService.get.mockReturnValue('test-secret');
      redisService.addRefreshToken.mockResolvedValue('refresh-token');

      const result = await service.verifyCode(verifyCodeDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(usersService.createWithExistingStateArchive).toHaveBeenCalledWith(
        'archive-123',
      );
    });

    it('should throw NotFoundException when state archive not found', async () => {
      verificationCodeService.verifyAndConsumeCode.mockResolvedValue({
        code: '123456',
        method: 'email',
        egn: '1234567890',
      });
      stateArchiveService.findByEgn.mockResolvedValue(null);

      await expect(service.verifyCode(verifyCodeDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refreshToken', () => {
    const oldRefreshToken = 'old-refresh-token';

    it('should refresh tokens successfully', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-123' });
      redisService.getRefreshToken.mockResolvedValue('old-refresh-token');
      usersService.findOne.mockResolvedValue(mockUser as any);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      configService.get.mockReturnValue('test-secret');
      redisService.addRefreshToken.mockResolvedValue('new-refresh-token');

      const result = await service.refreshToken(oldRefreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(jwtService.verify).toHaveBeenCalledWith(oldRefreshToken, {
        secret: 'test-secret',
      });
      expect(redisService.getRefreshToken).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(oldRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(oldRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException when stored token does not match', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-123' });
      redisService.getRefreshToken.mockResolvedValue('different-token');

      await expect(service.refreshToken(oldRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(oldRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException when no token in Redis', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-123' });
      redisService.getRefreshToken.mockResolvedValue(null);

      await expect(service.refreshToken(oldRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(oldRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-123' });
      redisService.getRefreshToken.mockResolvedValue('old-refresh-token');
      usersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.refreshToken(oldRefreshToken)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token from Redis', async () => {
      redisService.removeRefreshToken.mockResolvedValue();

      const result = await service.logout('user-123');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(redisService.removeRefreshToken).toHaveBeenCalledWith('user-123');
    });
  });

  describe('generateTokens - SABOTAGE mode', () => {
    it('should return sabotage tokens when SABOTAGE is TRUE', async () => {
      configService.get.mockReturnValueOnce('TRUE'); // SABOTAGE
      const result = await service['generateTokens'](mockUser as any);

      expect(result).toEqual({
        accessToken: 'NqmaToken',
        refreshToken: 'NqmaToken',
      });
    });
  });
});
