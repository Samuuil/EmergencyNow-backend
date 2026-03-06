import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import twilio from 'twilio';

jest.mock('twilio');

describe('SmsService', () => {
  let service: SmsService;
  let mockTwilioClient: any;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockTwilioClient = {
      messages: {
        create: jest.fn(),
      },
    };

    (twilio as unknown as jest.Mock).mockReturnValue(mockTwilioClient);

    mockConfigService.get
      .mockReturnValueOnce('ACxxxxxx') // ACCOUNT_SID
      .mockReturnValueOnce('auth_token') // AUTH_TOKEN
      .mockReturnValueOnce('+1234567890'); // TWILIO_PHONE_NUMBER

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationCode', () => {
    const phoneNumber = '+0987654321';
    const code = '123456';
    const fullName = 'John User';

    it('should send verification code SMS successfully', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({ sid: 'SM123' });

      await service.sendVerificationCode(phoneNumber, code, fullName);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining(code),
        from: '+1234567890',
        to: phoneNumber,
      });
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining(fullName),
        from: '+1234567890',
        to: phoneNumber,
      });
    });

    it('should throw error when SMS sending fails', async () => {
      const error = new Error('Twilio API error');
      mockTwilioClient.messages.create.mockRejectedValue(error);

      await expect(
        service.sendVerificationCode(phoneNumber, code, fullName),
      ).rejects.toThrow('Twilio API error');
    });
  });

  describe('sendEmergencyAlert', () => {
    const contactPhoneNumber = '+0987654321';
    const contactName = 'John Contact';
    const userName = 'Jane User';
    const latitude = 42.6977;
    const longitude = 23.3219;
    const description = 'Chest pain';

    it('should send emergency alert SMS successfully', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({ sid: 'SM456' });

      await service.sendEmergencyAlert(
        contactPhoneNumber,
        contactName,
        userName,
        latitude,
        longitude,
        description,
      );

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('URGENT'),
        from: '+1234567890',
        to: contactPhoneNumber,
      });
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining(contactName),
        from: '+1234567890',
        to: contactPhoneNumber,
      });
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining(userName),
        from: '+1234567890',
        to: contactPhoneNumber,
      });
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining(description),
        from: '+1234567890',
        to: contactPhoneNumber,
      });
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining(latitude.toFixed(6)),
        from: '+1234567890',
        to: contactPhoneNumber,
      });
    });

    it('should send emergency alert SMS without description', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({ sid: 'SM456' });

      await service.sendEmergencyAlert(
        contactPhoneNumber,
        contactName,
        userName,
        latitude,
        longitude,
      );

      expect(mockTwilioClient.messages.create).toHaveBeenCalled();
    });

    it('should handle SMS sending errors gracefully', async () => {
      mockTwilioClient.messages.create.mockRejectedValue(
        new Error('Twilio API error'),
      );

      await expect(
        service.sendEmergencyAlert(
          contactPhoneNumber,
          contactName,
          userName,
          latitude,
          longitude,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('initialization without credentials', () => {
    it('should handle missing Twilio credentials gracefully', async () => {
      const mockConfigServiceNoCredentials = {
        get: jest.fn(),
      };

      mockConfigServiceNoCredentials.get
        .mockReturnValueOnce(undefined) // ACCOUNT_SID
        .mockReturnValueOnce(undefined) // AUTH_TOKEN
        .mockReturnValueOnce(''); // TWILIO_PHONE_NUMBER

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceNoCredentials,
          },
        ],
      }).compile();

      const serviceWithoutCredentials = module.get<SmsService>(SmsService);

      await expect(
        serviceWithoutCredentials.sendVerificationCode(
          '+1234567890',
          '123456',
          'Test User',
        ),
      ).rejects.toThrow('Twilio SMS service not configured');
    });

    it('should not send emergency alert when Twilio not configured', async () => {
      const mockConfigServiceNoCredentials = {
        get: jest.fn(),
      };

      mockConfigServiceNoCredentials.get
        .mockReturnValueOnce(undefined) // ACCOUNT_SID
        .mockReturnValueOnce(undefined) // AUTH_TOKEN
        .mockReturnValueOnce(''); // TWILIO_PHONE_NUMBER

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceNoCredentials,
          },
        ],
      }).compile();

      const serviceWithoutCredentials = module.get<SmsService>(SmsService);

      await expect(
        serviceWithoutCredentials.sendEmergencyAlert(
          '+1234567890',
          'Contact',
          'User',
          42.6977,
          23.3219,
        ),
      ).resolves.not.toThrow();
    });
  });
});
