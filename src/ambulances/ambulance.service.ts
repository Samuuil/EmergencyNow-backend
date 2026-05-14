import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate, PaginateQuery, FilterOperator } from 'nestjs-paginate';
import { Ambulance } from './entities/ambulance.entity';
import { UsersService } from '../users/user.service';
import { CreateAmbulanceDto } from './dtos/createAmbulance.dto';
import { UpdateAmbulanceDto } from './dtos/updateAmbulance.dto';
import {
  AmbulanceErrorCode,
  AmbulanceErrorMessages,
} from './errors/ambulance-errors.enum';

@Injectable()
export class AmbulancesService {
  private readonly logger = new Logger(AmbulancesService.name);

  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepository: Repository<Ambulance>,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateAmbulanceDto, driverId?: string): Promise<Ambulance> {
    try {
      const existing = await this.ambulanceRepository.findOne({
        where: { licensePlate: dto.licensePlate },
      });
      if (existing) {
        throw new ConflictException({
          code: AmbulanceErrorCode.AMBULANCE_ALREADY_EXISTS,
          message:
            AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_ALREADY_EXISTS],
        });
      }

      if (driverId) {
        const driverExists = await this.usersService.exists(driverId);
        if (!driverExists) {
          throw new NotFoundException({
            code: AmbulanceErrorCode.DRIVER_NOT_FOUND,
            message:
              AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_NOT_FOUND],
          });
        }
      }

      const ambulance = this.ambulanceRepository.create({
        ...dto,
        driverId: driverId ?? null,
        available: true,
      });

      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_CREATION_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_CREATION_FAILED,
        message:
          AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_CREATION_FAILED],
      });
    }
  }

  async findAll(query: PaginateQuery) {
    try {
      return paginate(query, this.ambulanceRepository, {
        sortableColumns: ['licensePlate', 'available', 'createdAt'],
        defaultSortBy: [['createdAt', 'DESC']],
        searchableColumns: ['licensePlate'],
        filterableColumns: {
          available: [FilterOperator.EQ],
          licensePlate: [FilterOperator.ILIKE],
        },
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.DATABASE_ERROR,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findOne(id: string): Promise<Ambulance> {
    try {
      const ambulance = await this.ambulanceRepository.findOne({
        where: { id },
      });

      if (!ambulance) {
        throw new NotFoundException({
          code: AmbulanceErrorCode.AMBULANCE_NOT_FOUND,
          message:
            AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_NOT_FOUND],
        });
      }

      return ambulance;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.DATABASE_ERROR,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR],
      });
    }
  }

  async update(id: string, dto: UpdateAmbulanceDto): Promise<Ambulance> {
    try {
      const ambulance = await this.findOne(id);

      if (dto.licensePlate && dto.licensePlate !== ambulance.licensePlate) {
        const existingAmbulance = await this.ambulanceRepository.findOne({
          where: { licensePlate: dto.licensePlate },
        });

        if (existingAmbulance) {
          throw new ConflictException({
            code: AmbulanceErrorCode.AMBULANCE_ALREADY_EXISTS,
            message:
              AmbulanceErrorMessages[
                AmbulanceErrorCode.AMBULANCE_ALREADY_EXISTS
              ],
          });
        }
      }

      if (dto.driverId) {
        const driverExists = await this.usersService.exists(dto.driverId);
        if (!driverExists) {
          throw new NotFoundException({
            code: AmbulanceErrorCode.DRIVER_NOT_FOUND,
            message:
              AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_NOT_FOUND],
          });
        }
      }

      Object.assign(ambulance, dto);
      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED,
        message:
          AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED],
      });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const ambulance = await this.findOne(id);
      await this.ambulanceRepository.remove(ambulance);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_DELETE_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_DELETE_FAILED,
        message:
          AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_DELETE_FAILED],
      });
    }
  }

  async findAvailable(query: PaginateQuery) {
    try {
      return paginate(query, this.ambulanceRepository, {
        sortableColumns: ['licensePlate', 'createdAt'],
        defaultSortBy: [['createdAt', 'DESC']],
        searchableColumns: ['licensePlate'],
        filterableColumns: {
          licensePlate: [FilterOperator.ILIKE],
        },
        where: { available: true },
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.DATABASE_ERROR,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findAvailableList(): Promise<Ambulance[]> {
    try {
      return await this.ambulanceRepository.find({
        where: { available: true },
      });
    } catch (error) {
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.DATABASE_ERROR,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findAvailableWithDriver(): Promise<Ambulance[]> {
    return this.ambulanceRepository
      .createQueryBuilder('ambulance')
      .where('ambulance.available = :available', { available: true })
      .andWhere('ambulance.driverId IS NOT NULL')
      .getMany();
  }

  async markAsDispatched(id: string): Promise<Ambulance> {
    try {
      const ambulance = await this.findOne(id);
      ambulance.available = false;
      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED,
        message:
          AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED],
      });
    }
  }

  async markAsAvailable(id: string): Promise<Ambulance> {
    try {
      const ambulance = await this.findOne(id);
      const wasUnavailable = !ambulance.available;
      ambulance.available = true;
      const saved = await this.ambulanceRepository.save(ambulance);

      if (wasUnavailable) {
        this.eventEmitter
          .emitAsync('ambulance.available', { ambulanceId: saved.id })
          .catch((err) =>
            this.logger.error('Failed to emit ambulance.available event', err),
          );
      }

      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED,
        message:
          AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED],
      });
    }
  }

  async updateLocation(
    id: string,
    latitude: number,
    longitude: number,
  ): Promise<Ambulance> {
    try {
      const ambulance = await this.findOne(id);
      ambulance.latitude = latitude;
      ambulance.longitude = longitude;
      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.LOCATION_UPDATE_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.LOCATION_UPDATE_FAILED,
        message:
          AmbulanceErrorMessages[AmbulanceErrorCode.LOCATION_UPDATE_FAILED],
      });
    }
  }

  async assignDriver(id: string, driverId: string): Promise<Ambulance> {
    try {
      const ambulance = await this.findOne(id);

      const driverExists = await this.usersService.exists(driverId);
      if (!driverExists) {
        throw new NotFoundException({
          code: AmbulanceErrorCode.DRIVER_NOT_FOUND,
          message: AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_NOT_FOUND],
        });
      }

      const ambulanceWithDriver = await this.ambulanceRepository.findOne({
        where: { driverId },
      });

      if (ambulanceWithDriver && ambulanceWithDriver.id !== id) {
        throw new BadRequestException({
          code: AmbulanceErrorCode.DRIVER_ALREADY_ASSIGNED,
          message:
            AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_ALREADY_ASSIGNED],
        });
      }

      ambulance.driverId = driverId;
      ambulance.lastCallAcceptedAt = new Date();
      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_ASSIGNMENT_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.DRIVER_ASSIGNMENT_FAILED,
        message:
          AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_ASSIGNMENT_FAILED],
      });
    }
  }

  async removeDriver(id: string): Promise<Ambulance> {
    try {
      const ambulance = await this.findOne(id);
      ambulance.driverId = null;
      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `${AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_REMOVAL_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.DRIVER_REMOVAL_FAILED,
        message:
          AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_REMOVAL_FAILED],
      });
    }
  }

  async findByDriver(driverId: string): Promise<Ambulance | null> {
    return await this.ambulanceRepository.findOne({
      where: { driverId },
    });
  }

  async getDriverIdToAmbulanceIdMap(): Promise<Map<string, string>> {
    const ambulances = await this.findAvailableWithDriver();
    const map = new Map<string, string>();
    for (const amb of ambulances) {
      if (amb.driverId) {
        map.set(amb.driverId, amb.id);
      }
    }
    return map;
  }

  async updateLastCallAcceptedAt(ambulanceId: string): Promise<void> {
    await this.ambulanceRepository.update(ambulanceId, {
      lastCallAcceptedAt: new Date(),
    });
  }

  async removeInactiveDrivers(
    inactivityThresholdHours: number = 5,
  ): Promise<string[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - inactivityThresholdHours);

    const inactiveAmbulances = await this.ambulanceRepository
      .createQueryBuilder('ambulance')
      .where('ambulance.driverId IS NOT NULL')
      .andWhere(
        '(ambulance.lastCallAcceptedAt IS NULL OR ambulance.lastCallAcceptedAt < :threshold)',
        { threshold: thresholdDate },
      )
      .getMany();

    const removedDriverIds = inactiveAmbulances
      .map((a) => a.driverId)
      .filter((id): id is string => id !== null);

    if (removedDriverIds.length > 0) {
      await this.ambulanceRepository.update(
        { id: In(inactiveAmbulances.map((a) => a.id)) },
        { driverId: null, lastCallAcceptedAt: null },
      );
    }

    return removedDriverIds;
  }
}
