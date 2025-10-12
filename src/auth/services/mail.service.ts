import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = parseInt(this.configService.get<string>('MAIL_PORT', '587'), 10);
    const secureStr = this.configService.get<string>('MAIL_SECURE', 'false');
    const secure = secureStr === 'true';
    
    this.logger.log(`Initializing mail service with host=${host}, port=${port}, secure=${secure}`);
    
    this.transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: secure,
      requireTLS: !secure,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: this.configService.get<string>('NODE_ENV') === 'production',
      },
      logger: true,
      debug: this.configService.get<string>('NODE_ENV') !== 'production',
    });
  }

  async sendVerificationCode(email: string, code: string, fullName: string): Promise<void> {
    try {
      this.logger.log(`Sending verification code to ${email}`);
      
      const mailOptions = {
        from: this.configService.get<string>('MAIL_FROM'),
        to: email,
        subject: 'EmergencyNow - Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">EmergencyNow Verification Code</h2>
            <p>Hello ${fullName},</p>
            <p>Your verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">EmergencyNow - Emergency Services Platform</p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }
}
