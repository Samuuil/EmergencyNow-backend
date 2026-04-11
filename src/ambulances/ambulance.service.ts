import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate, PaginateQuery, FilterOperator } from 'nestjs-paginate';
import { Ambulance } from './entities/ambulance.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/user.service';
import {
  GoogleMapsService,
  Location,
} from '../common/services/google-maps.service';
import { CreateAmbulanceDto } from './dtos/createAmbulance.dto';
import { UpdateAmbulanceDto } from './dtos/updateAmbulance.dto';
import {
  AmbulanceErrorCode,
  AmbulanceErrorMessages,
} from './errors/ambulance-errors.enum';

export interface AmbulanceWithDistance extends Ambulance {
  distance: number;
  duration: number;
}

@Injectable()
export class AmbulancesService {
  private readonly logger = new Logger(AmbulancesService.name);

  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepository: Repository<Ambulance>,
    private readonly usersService: UsersService,
    private readonly googleMapsService: GoogleMapsService,
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

  async bulkUpdateLocations(
    updates: Array<{
      ambulanceId: string;
      latitude: number;
      longitude: number;
    }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    await Promise.all(
      updates.map((u) =>
        this.ambulanceRepository.update(u.ambulanceId, {
          latitude: u.latitude,
          longitude: u.longitude,
        }),
      ),
    );
  }

  async findNearestAvailableAmbulanceExcluding(
    location: Location,
    excludeAmbulanceIds: string[] = [],
  ): Promise<AmbulanceWithDistance | null> {
    const availableAmbulances = await this.findAvailableList();

    const filtered = availableAmbulances.filter(
      (amb) =>
        amb.latitude != null &&
        amb.longitude != null &&
        !excludeAmbulanceIds.includes(amb.id),
    );

    if (filtered.length === 0) {
      return null;
    }

    const ambulanceLocations = filtered.map((amb) => ({
      latitude: amb.latitude,
      longitude: amb.longitude,
    }));

    const distances =
      await this.googleMapsService.getDistancesToMultipleDestinations(
        location,
        ambulanceLocations,
      );

    let minIndex = 0;
    let minDuration = distances[0].duration;

    for (let i = 1; i < distances.length; i++) {
      if (distances[i].duration < minDuration) {
        minDuration = distances[i].duration;
        minIndex = i;
      }
    }

    return {
      ...filtered[minIndex],
      distance: distances[minIndex].distance,
      duration: distances[minIndex].duration,
    };
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
      ambulance.available = true;
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

  async findAvailableWithDriverEgn(egn: string): Promise<Ambulance[]> {
    return this.ambulanceRepository
      .createQueryBuilder('ambulance')
      .innerJoin(User, 'driver', 'ambulance.driverId = driver.id')
      .innerJoin('driver.stateArchive', 'stateArchive')
      .where('ambulance.available = :available', { available: true })
      .andWhere('ambulance.driverId IS NOT NULL')
      .andWhere('stateArchive.egn = :egn', { egn })
      .select('ambulance.id')
      .getMany();
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
