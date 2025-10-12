import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';
import { User } from './entities/user.entity';
import { StateArchive } from '../state-archive/entities/state-archive.entity';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Profile } from 'src/profiles/entities/profile.entity';
import { Call } from 'src/calls/entities/call.entity';
import { Contact } from 'src/contacts/entities/contact.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StateArchive, Profile, Call, Contact]),
    JwtModule.register({}),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
