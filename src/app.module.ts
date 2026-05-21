import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { AmbulancesModule } from './ambulances/ambulance.module';
import { CallsModule } from './calls/call.module';
import { ProfilesModule } from './profiles/profile.module';
import { UsersModule } from './users/user.module';
import { StateArchiveModule } from './state-archive/state-archive.module';
import { ContactsModule } from './contacts/contact.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SeedingModule } from './seeding/seeding.module';
import { DispatchersModule } from './dispatchers/dispatcher.module';
import { PushTokensModule } from './push-tokens/push-tokens.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: parseInt(config.get<string>('THROTTLE_TTL', '60000'), 10),
          limit: parseInt(config.get<string>('THROTTLE_LIMIT', '1000'), 10),
        },
      ],
    }),
    EventEmitterModule.forRoot(),
    RedisModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER'),
        password: config.get('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
    AmbulancesModule,
    CallsModule,
    ProfilesModule,
    UsersModule,
    StateArchiveModule,
    ContactsModule,
    HospitalsModule,
    RealtimeModule,
    SeedingModule,
    DispatchersModule,
    PushTokensModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
