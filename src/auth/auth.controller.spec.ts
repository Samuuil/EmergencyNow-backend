import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InitiateLoginDto, LoginMethod } from './dto/initiate-login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const mockAuthService = {
    initiateLogin: jest.fn(),
    verifyCode: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateLogin', () => {
    const initiateLoginDto: InitiateLoginDto = {
      egn: '1234567890',
      method: LoginMethod.EMAIL,
    };

    it('should initiate login via email', async () => {
      const expectedResponse = {
        message: 'Verification code sent to your email',
      };
      service.initiateLogin.mockResolvedValue(expectedResponse);

      const result = await controller.initiateLogin(initiateLoginDto);

      expect(result).toEqual(expectedResponse);
      expect(service.initiateLogin).toHaveBeenCalledWith(initiateLoginDto);
    });

    it('should initiate login via SMS', async () => {
      const smsDto: InitiateLoginDto = {
        egn: '1234567890',
        method: LoginMethod.SMS,
      };
      const expectedResponse = {
        message: 'Verification code sent to your phone',
      };
      service.initiateLogin.mockResolvedValue(expectedResponse);

      const result = await controller.initiateLogin(smsDto);

      expect(result).toEqual(expectedResponse);
      expect(service.initiateLogin).toHaveBeenCalledWith(smsDto);
    });
  });

  describe('verifyCode', () => {
    const verifyCodeDto: VerifyCodeDto = {
      egn: '1234567890',
      code: '123456',
    };

    it('should verify code and return tokens', async () => {
      const expectedResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      service.verifyCode.mockResolvedValue(expectedResponse);

      const result = await controller.verifyCode(verifyCodeDto);

      expect(result).toEqual(expectedResponse);
      expect(service.verifyCode).toHaveBeenCalledWith(verifyCodeDto);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'old-refresh-token',
    };

    it('should refresh access token', async () => {
      const expectedResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      service.refreshToken.mockResolvedValue(expectedResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(expectedResponse);
      expect(service.refreshToken).toHaveBeenCalledWith('old-refresh-token');
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const mockRequest = { user: { sub: 'user-123' } };
      const expectedResponse = { message: 'Logged out successfully' };
      service.logout.mockResolvedValue(expectedResponse);

      const result = await controller.logout(mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(service.logout).toHaveBeenCalledWith('user-123');
    });
  });
});
