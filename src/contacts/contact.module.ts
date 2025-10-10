import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { ContactsService } from './contact.service';
import { ContactsController } from './contact.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Contact]), JwtModule.register({})],
  controllers: [ContactsController],
  providers: [ContactsService, JwtAuthGuard, RolesGuard],
  exports: [ContactsService],
})
export class ContactsModule {}
