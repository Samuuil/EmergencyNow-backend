import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import * as crypto from 'crypto';

export interface VerificationCodeData {
  code: string;
  method: 'email' | 'sms';
  egn: string;
}

@Injectable()
export class VerificationCodeService {
  private readonly CODE_TTL_SECONDS = 600; // 10 minutes
  private readonly KEY_PREFIX = 'verify';

  constructor(private redisService: RedisService) {}

  /**
   * Generate a 6-digit verification code
   */
  generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Build Redis key for verification code
   */
  private buildKey(egn: string, method: 'email' | 'sms'): string {
    return `${this.KEY_PREFIX}:${method}:${egn}`;
  }

  /**
   * Save verification code to Redis with TTL
   */
  async saveCode(egn: string, code: string, method: 'email' | 'sms'): Promise<void> {
    const key = this.buildKey(egn, method);
    const data: VerificationCodeData = { code, method, egn };
    
    await this.redisService.setex(
      key,
      this.CODE_TTL_SECONDS,
      JSON.stringify(data)
    );
  }

  /**
   * Verify code and consume it (one-time use)
   * Returns the verification data if valid, throws UnauthorizedException otherwise
   */
  async verifyAndConsumeCode(egn: string, code: string): Promise<VerificationCodeData> {
    // Try both email and SMS methods
    const emailKey = this.buildKey(egn, 'email');
    const smsKey = this.buildKey(egn, 'sms');

    // Get and delete from both keys (GETDEL is atomic)
    const emailData = await this.redisService.getdel(emailKey);
    const smsData = await this.redisService.getdel(smsKey);

    let verificationData: VerificationCodeData | null = null;

    if (emailData) {
      try {
        const parsed = JSON.parse(emailData);
        if (parsed.code === code) {
          verificationData = parsed;
        }
      } catch (error) {
        // Invalid JSON, ignore
      }
    }

    if (!verificationData && smsData) {
      try {
        const parsed = JSON.parse(smsData);
        if (parsed.code === code) {
          verificationData = parsed;
        }
      } catch (error) {
        // Invalid JSON, ignore
      }
    }

    if (!verificationData) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    return verificationData;
  }

  /**
   * Check if a code exists for the given EGN
   */
  async hasActiveCode(egn: string, method: 'email' | 'sms'): Promise<boolean> {
    const key = this.buildKey(egn, method);
    const exists = await this.redisService.exists(key);
    return exists === 1;
  }

  /**
   * Get remaining TTL for a code
   */
  async getRemainingTTL(egn: string, method: 'email' | 'sms'): Promise<number> {
    const key = this.buildKey(egn, method);
    return await this.redisService.ttl(key);
  }

  /**
   * Delete verification code manually (e.g., for admin purposes)
   */
  async deleteCode(egn: string, method: 'email' | 'sms'): Promise<void> {
    const key = this.buildKey(egn, method);
    await this.redisService.del(key);
  }
}
