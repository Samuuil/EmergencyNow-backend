import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './entities/push-token.entity';
import { PushTokensService } from './push-tokens.service';
import { PushTokensController } from './push-tokens.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  providers: [PushTokensService],
  controllers: [PushTokensController],
  exports: [PushTokensService],
})
export class PushTokensModule {}
