import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  async sendVerificationCode(phoneNumber: string, code: string, fullName: string): Promise<void> {
    this.logger.log(`SMS to ${phoneNumber}: Your EmergencyNow verification code is: ${code}`);

  }
}
