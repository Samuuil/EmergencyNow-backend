import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly twilioClient: twilio.Twilio;
  private readonly twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('ACCOUNT_SID');
    const authToken = this.configService.get<string>('AUTH_TOKEN');
    this.twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (!accountSid || !authToken) {
      this.logger.warn('Twilio credentials not configured. SMS functionality will be limited.');
    } else {
      this.twilioClient = twilio(accountSid, authToken);
      this.logger.log('Twilio SMS service initialized');
    }
  }

  async sendVerificationCode(phoneNumber: string, code: string, fullName: string): Promise<void> {
    try {
      this.logger.log(`Sending verification code SMS to ${phoneNumber}`);

      if (!this.twilioClient || !this.twilioPhoneNumber) {
        this.logger.error('Twilio not properly configured. Cannot send SMS.');
        throw new Error('Twilio SMS service not configured');
      }

      const message = `Hello ${fullName}, your EmergencyNow verification code is: ${code}. This code will expire in 10 minutes. If you didn't request this code, please ignore this message.`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber,
      });

      this.logger.log(`Verification code SMS sent successfully to ${phoneNumber}: ${result.sid}`);
    } catch (error) {
      this.logger.error(`Failed to send verification code SMS to ${phoneNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendEmergencyAlert(
    contactPhoneNumber: string,
    contactName: string,
    userName: string,
    latitude: number,
    longitude: number,
    description?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Sending emergency alert SMS to ${contactPhoneNumber}`);

      if (!this.twilioClient || !this.twilioPhoneNumber) {
        this.logger.error('Twilio not properly configured. Cannot send SMS.');
        return;
      }

      const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      let message = `URGENT: Emergency Alert - EmergencyNow\n\nDear ${contactName},\n\n${userName} has had an emergency and an ambulance has been dispatched to their location.\n\n`;

      if (description) {
        message += `Description: ${description}\n\n`;
      }

      message += `Location:\nLatitude: ${latitude.toFixed(6)}\nLongitude: ${longitude.toFixed(6)}\n\nView on Google Maps: ${mapsLink}\n\nWe will keep you updated on the situation.`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: contactPhoneNumber,
      });

      this.logger.log(`Emergency alert SMS sent successfully to ${contactPhoneNumber}: ${result.sid}`);
    } catch (error) {
      this.logger.error(`Failed to send emergency alert SMS to ${contactPhoneNumber}: ${error.message}`, error.stack);
    }
  }
}
