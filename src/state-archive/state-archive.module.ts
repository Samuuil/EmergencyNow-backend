import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StateArchive } from './entities/state-archive.entity';
import { StateArchiveService } from './state-archive.service';
import { StateArchiveController } from './state-archive.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StateArchive]),
    HttpModule,
  ],
  controllers: [StateArchiveController],
  providers: [StateArchiveService],
  exports: [StateArchiveService],
})
export class StateArchiveModule {}
