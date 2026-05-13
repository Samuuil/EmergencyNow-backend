import { Module } from '@nestjs/common';
import { PushTokensModule } from '../push-tokens/push-tokens.module';
import { FirebaseAdminService } from './firebase-admin.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [PushTokensModule],
  providers: [FirebaseAdminService, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
