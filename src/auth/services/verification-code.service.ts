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

  private normalizeEgn(egn: string): string {
    return (egn ?? '').trim();
  }

  private normalizeCode(code: string): string {
    return (code ?? '').trim();
  }

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
    const normEgn = this.normalizeEgn(egn);
    const normCode = this.normalizeCode(code);
    const key = this.buildKey(normEgn, method);
    const data: VerificationCodeData = { code: normCode, method, egn: normEgn };
    
    await this.redisService.setex(
      key,
      this.CODE_TTL_SECONDS,
      JSON.stringify(data)
    );
  }

  /**
   * Verify code and consume it (one-time use)
   * Returns the verification data if valid, throws UnauthorizedException otherwise.
   *
   * Important: We DO NOT delete codes unless the provided code matches.
   * This prevents accidental consumption when a wrong code is submitted.
   */
  async verifyAndConsumeCode(egn: string, code: string): Promise<VerificationCodeData> {
    const normEgn = this.normalizeEgn(egn);
    const normCode = this.normalizeCode(code);
    // Try both email and SMS methods
    const emailKey = this.buildKey(normEgn, 'email');
    const smsKey = this.buildKey(normEgn, 'sms');

    // Read values without deleting first
    const [emailData, smsData] = await Promise.all([
      this.redisService.get(emailKey),
      this.redisService.get(smsKey),
    ]);

    // Helper to parse JSON safely
    const tryParse = (val: string | null): VerificationCodeData | null => {
      if (!val) return null;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    };

    const emailParsed = tryParse(emailData);
    if (emailParsed && emailParsed.code === normCode) {
      // Consume the correct key only
      await this.redisService.del(emailKey);
      return emailParsed;
    }

    const smsParsed = tryParse(smsData);
    if (smsParsed && smsParsed.code === normCode) {
      // Consume the correct key only
      await this.redisService.del(smsKey);
      return smsParsed;
    }

    // No match found
    throw new UnauthorizedException('Invalid or expired verification code');
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
