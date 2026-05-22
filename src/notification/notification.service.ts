import { Injectable, Logger } from '@nestjs/common';
import { PushTokensService } from '../push-tokens/push-tokens.service';
import { NotificationDataDto } from './dtos/notification-data.dto';
import { NotificationTypeEnum } from './enums/notification-type.enum';
import { FirebaseAdminService } from './firebase-admin.service';

const DEAD_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly pushTokensService: PushTokensService,
  ) {}

  async sendCallOffer(
    driverUserId: string,
    payload: {
      callId: string;
      description: string;
      latitude: number;
      longitude: number;
      distance: number;
      duration: number;
      priority?: string;
    },
  ): Promise<void> {
    await this.sendDataPush(driverUserId, NotificationTypeEnum.CallOffer, {
      callId: payload.callId,
      description: payload.description,
      latitude: payload.latitude,
      longitude: payload.longitude,
      distance: payload.distance,
      duration: payload.duration,
      priority: payload.priority ?? 'high',
    });
  }

  async sendCallCancelled(driverUserId: string, callId: string): Promise<void> {
    await this.sendDataPush(driverUserId, NotificationTypeEnum.CallCancelled, {
      callId,
    });
  }

  private async sendDataPush(
    userId: string,
    type: NotificationTypeEnum,
    data: NotificationDataDto,
  ): Promise<void> {
    try {
      const tokens = await this.pushTokensService.getTokens(userId);
      if (tokens.length === 0) {
        this.logger.warn(
          `No push tokens registered for user ${userId}; skipping ${type}`,
        );
        return;
      }

      const stringified = this.convertDataToStrings({ ...data, type });

      const deadTokens: string[] = [];
      await Promise.all(
        tokens.map(async (token) => {
          try {
            await this.firebaseAdminService.sendDataOnlyToToken(
              token,
              stringified,
            );
          } catch (error) {
            const code = (error as { code?: string } | null)?.code;
            if (code && DEAD_TOKEN_ERROR_CODES.has(code)) {
              deadTokens.push(token);
            } else {
              this.logger.error(
                `Failed to send ${type} push to user ${userId}`,
                error,
              );
            }
          }
        }),
      );

      if (deadTokens.length > 0) {
        await this.pushTokensService.removeMany(deadTokens);
      }
    } catch (error) {
      this.logger.error(
        `Unexpected error while sending ${type} push to user ${userId}`,
        error,
      );
    }
  }

  private convertDataToStrings(
    data: Record<string, unknown>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      result[key] =
        typeof value === 'string'
          ? value
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value as number | boolean | bigint);
    }
    return result;
  }
}
