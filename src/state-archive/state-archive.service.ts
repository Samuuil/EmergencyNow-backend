import { Injectable, NotFoundException, InternalServerErrorException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { paginate, PaginateQuery, FilterOperator } from 'nestjs-paginate';
import { StateArchive } from './entities/state-archive.entity';
import { CreateStateArchiveDto } from './dto/create-state-archive.dto';
import { UpdateStateArchiveDto } from './dto/update-state-archive.dto';
import { StateArchiveErrorCode, StateArchiveErrorMessages } from './errors/state-archive-errors.enum';

@Injectable()
export class StateArchiveService {
  private readonly logger = new Logger(StateArchiveService.name);

  constructor(
    @InjectRepository(StateArchive)
    private readonly archiveRepo: Repository<StateArchive>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(createDto: CreateStateArchiveDto): Promise<StateArchive> {
    try {
      const existing = await this.archiveRepo.findOne({ where: { egn: createDto.egn } });
      if (existing) {
        throw new ConflictException({
          code: StateArchiveErrorCode.EGN_ALREADY_EXISTS,
          message: StateArchiveErrorMessages[StateArchiveErrorCode.EGN_ALREADY_EXISTS],
        });
      }
      const archive = this.archiveRepo.create(createDto);
      return await this.archiveRepo.save(archive);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`${StateArchiveErrorMessages[StateArchiveErrorCode.STATE_ARCHIVE_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: StateArchiveErrorCode.STATE_ARCHIVE_CREATION_FAILED,
        message: StateArchiveErrorMessages[StateArchiveErrorCode.STATE_ARCHIVE_CREATION_FAILED],
      });
    }
  }

  async findAll(query: PaginateQuery) {
    try {
      return paginate(query, this.archiveRepo, {
        sortableColumns: ['id', 'egn', 'fullName', 'email', 'phoneNumber'],
        defaultSortBy: [['fullName', 'ASC']],
        searchableColumns: ['egn', 'fullName', 'email', 'phoneNumber'],
        filterableColumns: {
          egn: [FilterOperator.ILIKE],
          fullName: [FilterOperator.ILIKE],
          email: [FilterOperator.ILIKE],
          phoneNumber: [FilterOperator.ILIKE],
        },
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(`${StateArchiveErrorMessages[StateArchiveErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: StateArchiveErrorCode.DATABASE_ERROR,
        message: StateArchiveErrorMessages[StateArchiveErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findOne(id: string): Promise<StateArchive> {
    try {
      const archive = await this.archiveRepo.findOne({ where: { id } });
      if (!archive) {
        throw new NotFoundException({
          code: StateArchiveErrorCode.STATE_ARCHIVE_NOT_FOUND,
          message: StateArchiveErrorMessages[StateArchiveErrorCode.STATE_ARCHIVE_NOT_FOUND],
        });
      }
      return archive;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${StateArchiveErrorMessages[StateArchiveErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: StateArchiveErrorCode.DATABASE_ERROR,
        message: StateArchiveErrorMessages[StateArchiveErrorCode.DATABASE_ERROR],
      });
    }
  }

  async update(id: string, updateDto: UpdateStateArchiveDto): Promise<StateArchive> {
    try {
      const archive = await this.findOne(id);
      if (updateDto.egn && updateDto.egn !== archive.egn) {
        const existing = await this.archiveRepo.findOne({ where: { egn: updateDto.egn } });
        if (existing) {
          throw new ConflictException({
            code: StateArchiveErrorCode.EGN_ALREADY_EXISTS,
            message: StateArchiveErrorMessages[StateArchiveErrorCode.EGN_ALREADY_EXISTS],
          });
        }
      }
      Object.assign(archive, updateDto);
      return await this.archiveRepo.save(archive);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`${StateArchiveErrorMessages[StateArchiveErrorCode.STATE_ARCHIVE_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: StateArchiveErrorCode.STATE_ARCHIVE_UPDATE_FAILED,
        message: StateArchiveErrorMessages[StateArchiveErrorCode.STATE_ARCHIVE_UPDATE_FAILED],
      });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const archive = await this.findOne(id);
      await this.archiveRepo.remove(archive);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${StateArchiveErrorMessages[StateArchiveErrorCode.STATE_ARCHIVE_DELETE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: StateArchiveErrorCode.STATE_ARCHIVE_DELETE_FAILED,
        message: StateArchiveErrorMessages[StateArchiveErrorCode.STATE_ARCHIVE_DELETE_FAILED],
      });
    }
  }

  async findByEgn(egn: string): Promise<StateArchive | null> {
    try {
      let archive = await this.archiveRepo.findOne({ where: { egn } });
      
      if (archive) {
        return archive;
      }

      const stateArchiveUrl = this.configService.get<string>('STATE_ARCHIVE_URL');
      if (!stateArchiveUrl) {
        this.logger.error('STATE_ARCHIVE_URL is not configured');
        throw new InternalServerErrorException({
          code: StateArchiveErrorCode.DATABASE_ERROR,
          message: 'State archive URL is not configured',
        });
      }

      try {
        const url = `${stateArchiveUrl}/state-archive-mock/egn/${egn}`;
        this.logger.log(`Fetching state archive data from external API: ${url}`);
        
        const response = await firstValueFrom(
          this.httpService.get(url)
        );

        const externalData = response.data;
        
        if (!externalData) {
          return null;
        }

        archive = this.archiveRepo.create({
          egn: externalData.egn,
          fullName: externalData.fullName,
          email: externalData.email,
          phoneNumber: externalData.phoneNumber,
        });

        archive = await this.archiveRepo.save(archive);
        this.logger.log(`Saved state archive data for EGN: ${egn}`);
        
        return archive;
      } catch (httpError) {
        if (httpError.response?.status === 404) {
          this.logger.warn(`State archive not found for EGN: ${egn}`);
          return null;
        }
        this.logger.error(`Failed to fetch from external API: ${httpError.message}`, httpError.stack);
        throw new InternalServerErrorException({
          code: StateArchiveErrorCode.DATABASE_ERROR,
          message: 'Failed to fetch state archive data from external API',
        });
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`${StateArchiveErrorMessages[StateArchiveErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: StateArchiveErrorCode.DATABASE_ERROR,
        message: StateArchiveErrorMessages[StateArchiveErrorCode.DATABASE_ERROR],
      });
    }
  }
}
