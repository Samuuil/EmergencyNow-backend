import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let configService: jest.Mocked<ConfigService>;
  let mockTransporter: any;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn(),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    mockConfigService.get
      .mockReturnValueOnce('smtp.gmail.com') // MAIL_HOST
      .mockReturnValueOnce('587') // MAIL_PORT
      .mockReturnValueOnce('false') // MAIL_SECURE
      .mockReturnValueOnce('test@example.com') // MAIL_USER
      .mockReturnValueOnce('password') // MAIL_PASSWORD
      .mockReturnValueOnce('development'); // NODE_ENV

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmergencyAlert', () => {
    const contactEmail = 'contact@example.com';
    const contactName = 'John Contact';
    const userName = 'Jane User';
    const latitude = 42.6977;
    const longitude = 23.3219;
    const description = 'Chest pain';

    it('should send emergency alert email successfully', async () => {
      configService.get.mockReturnValue('noreply@emergencynow.com');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendEmergencyAlert(
        contactEmail,
        contactName,
        userName,
        latitude,
        longitude,
        description,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@emergencynow.com',
          to: contactEmail,
          subject: 'URGENT: Emergency Alert - EmergencyNow',
          html: expect.stringContaining(contactName),
        }),
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(userName),
        }),
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(description),
        }),
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(latitude.toFixed(6)),
        }),
      );
    });

    it('should send emergency alert without description', async () => {
      configService.get.mockReturnValue('noreply@emergencynow.com');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendEmergencyAlert(
        contactEmail,
        contactName,
        userName,
        latitude,
        longitude,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should handle email sending errors gracefully', async () => {
      configService.get.mockReturnValue('noreply@emergencynow.com');
      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      await expect(
        service.sendEmergencyAlert(
          contactEmail,
          contactName,
          userName,
          latitude,
          longitude,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('sendHospitalUpdate', () => {
    const contactEmail = 'contact@example.com';
    const contactName = 'John Contact';
    const userName = 'Jane User';
    const hospitalName = 'City Hospital';
    const estimatedDuration = 900; // 15 minutes in seconds

    it('should send hospital update email successfully', async () => {
      configService.get.mockReturnValue('noreply@emergencynow.com');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-456' });

      await service.sendHospitalUpdate(
        contactEmail,
        contactName,
        userName,
        hospitalName,
        estimatedDuration,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@emergencynow.com',
          to: contactEmail,
          subject: 'Update: Hospital Destination - EmergencyNow',
          html: expect.stringContaining(hospitalName),
        }),
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('approximately'),
        }),
      );
    });

    it('should send hospital update without estimated duration', async () => {
      configService.get.mockReturnValue('noreply@emergencynow.com');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-456' });

      await service.sendHospitalUpdate(
        contactEmail,
        contactName,
        userName,
        hospitalName,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should handle email sending errors gracefully', async () => {
      configService.get.mockReturnValue('noreply@emergencynow.com');
      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      await expect(
        service.sendHospitalUpdate(
          contactEmail,
          contactName,
          userName,
          hospitalName,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('sendVerificationCode', () => {
    const email = 'user@example.com';
    const code = '123456';
    const fullName = 'John User';

    it('should send verification code email successfully', async () => {
      configService.get.mockReturnValue('noreply@emergencynow.com');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-789' });

      await service.sendVerificationCode(email, code, fullName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@emergencynow.com',
          to: email,
          subject: 'EmergencyNow - Verification Code',
          html: expect.stringContaining(code),
        }),
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(fullName),
        }),
      );
    });

    it('should throw error when email sending fails', async () => {
      configService.get.mockReturnValue('noreply@emergencynow.com');
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendVerificationCode(email, code, fullName),
      ).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('initialization', () => {
    it('should be initialized', () => {
      expect(service).toBeDefined();
    });
  });
});
