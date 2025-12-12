import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
