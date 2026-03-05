import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter<nodemailer.SentMessageInfo>;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = parseInt(
      this.configService.get<string>('MAIL_PORT', '587'),
      10,
    );
    const secureStr = this.configService.get<string>('MAIL_SECURE', 'false');
    const secure = secureStr === 'true';

    this.logger.log(
      `Initializing mail service with host=${host}, port=${port}, secure=${secure}`,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
        rejectUnauthorized:
          this.configService.get<string>('NODE_ENV') === 'production',
      },
      logger: true,
      debug: this.configService.get<string>('NODE_ENV') !== 'production',
    });
  }

  async sendEmergencyAlert(
    contactEmail: string,
    contactName: string,
    userName: string,
    latitude: number,
    longitude: number,
    description?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Sending emergency alert to ${contactEmail}`);

      const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

      const mailOptions = {
        from: this.configService.get<string>('MAIL_FROM'),
        to: contactEmail,
        subject: 'URGENT: Emergency Alert - EmergencyNow',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc3545; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Emergency Alert</h1>
            </div>
            <div style="padding: 20px;">
              <p style="font-size: 16px;">Dear ${contactName},</p>
              <p style="font-size: 16px; color: #333;">
                <strong>${userName}</strong> has had an emergency and an ambulance has been dispatched to their location.
              </p>
              ${description ? `<p style="font-size: 14px; color: #666;"><strong>Description:</strong> ${description}</p>` : ''}
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-weight: bold;">Location Coordinates:</p>
                <p style="margin: 0; font-family: monospace; font-size: 14px;">
                  Latitude: ${latitude.toFixed(6)}<br>
                  Longitude: ${longitude.toFixed(6)}
                </p>
                <a href="${mapsLink}" style="display: inline-block; margin-top: 15px; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  View on Google Maps
                </a>
              </div>
              <p style="font-size: 14px; color: #666;">
                We will keep you updated on the situation. Please do not reply to this email.
              </p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #666; font-size: 12px;">EmergencyNow - Emergency Services Platform</p>
            </div>
          </div>
        `,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Emergency alert sent successfully to ${contactEmail}: ${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send emergency alert to ${contactEmail}: ${error}`,
      );
    }
  }

  async sendHospitalUpdate(
    contactEmail: string,
    contactName: string,
    userName: string,
    hospitalName: string,
    estimatedDuration?: number,
  ): Promise<void> {
    try {
      this.logger.log(`Sending hospital update to ${contactEmail}`);

      const durationText = estimatedDuration
        ? `Estimated arrival time: approximately ${Math.ceil(estimatedDuration / 60)} minutes`
        : '';

      const mailOptions = {
        from: this.configService.get<string>('MAIL_FROM'),
        to: contactEmail,
        subject: 'Update: Hospital Destination - EmergencyNow',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #28a745; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Hospital Update</h1>
            </div>
            <div style="padding: 20px;">
              <p style="font-size: 16px;">Dear ${contactName},</p>
              <p style="font-size: 16px; color: #333;">
                This is an update regarding <strong>${userName}</strong>'s emergency.
              </p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-weight: bold;">The ambulance is now heading to:</p>
                <p style="margin: 0; font-size: 18px; color: #28a745; font-weight: bold;">
                  ${hospitalName}
                </p>
                ${durationText ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">${durationText}</p>` : ''}
              </div>
              <p style="font-size: 14px; color: #666;">
                You may want to meet them at the hospital. Please do not reply to this email.
              </p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #666; font-size: 12px;">EmergencyNow - Emergency Services Platform</p>
            </div>
          </div>
        `,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Hospital update sent successfully to ${contactEmail}: ${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send hospital update to ${contactEmail}: ${error}`,
      );
    }
  }

  async sendVerificationCode(
    email: string,
    code: string,
    fullName: string,
  ): Promise<void> {
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const info = await this.transporter.sendMail(mailOptions);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send email: ${err.message}`, err.stack);
      throw error;
    }
  }
}
