import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export interface VerificationCodeData {
  code: string;
  method: 'email' | 'sms';
  egn: string;
}

@Injectable()
export class VerificationCodeService {
  private readonly CODE_TTL_SECONDS = 600;
  private readonly KEY_PREFIX = 'verify';

  constructor(private redisService: RedisService) {}

  private normalizeEgn(egn: string): string {
    return (egn ?? '').trim();
  }

  private normalizeCode(code: string): string {
    return (code ?? '').trim();
  }

  generateCode(): string {
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
  }

  private buildKey(egn: string, method: 'email' | 'sms'): string {
    return `${this.KEY_PREFIX}:${method}:${egn}`;
  }

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

  async verifyAndConsumeCode(egn: string, code: string): Promise<VerificationCodeData> {
    const normEgn = this.normalizeEgn(egn);
    const normCode = this.normalizeCode(code);
    const emailKey = this.buildKey(normEgn, 'email');
    const smsKey = this.buildKey(normEgn, 'sms');

    const [emailData, smsData] = await Promise.all([
      this.redisService.get(emailKey),
      this.redisService.get(smsKey),
    ]);

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
      await this.redisService.del(emailKey);
      return emailParsed;
    }

    const smsParsed = tryParse(smsData);
    if (smsParsed && smsParsed.code === normCode) {
      await this.redisService.del(smsKey);
      return smsParsed;
    }

    throw new UnauthorizedException('Invalid or expired verification code');
  }

  async hasActiveCode(egn: string, method: 'email' | 'sms'): Promise<boolean> {
    const key = this.buildKey(egn, method);
    const exists = await this.redisService.exists(key);
    return exists === 1;
  }

  async getRemainingTTL(egn: string, method: 'email' | 'sms'): Promise<number> {
    const key = this.buildKey(egn, method);
    return await this.redisService.ttl(key);
  }

  async deleteCode(egn: string, method: 'email' | 'sms'): Promise<void> {
    const key = this.buildKey(egn, method);
    await this.redisService.del(key);
  }
}
