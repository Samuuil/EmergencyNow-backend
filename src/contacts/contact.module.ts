import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { ContactsService } from './contact.service';
import { ContactsController, UserContactsController } from './contact.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, User]), JwtModule.register({})],
  controllers: [ContactsController, UserContactsController],
  providers: [ContactsService, JwtAuthGuard, RolesGuard],
  exports: [ContactsService],
})
export class ContactsModule {}
