import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ambulance } from './entities/ambulance.entity';
import { User } from '../users/entities/user.entity';
import { GoogleMapsService, Location } from '../common/services/google-maps.service';
import { CreateAmbulanceDto } from './dtos/createAmbulance.dto';
import { UpdateAmbulanceDto } from './dtos/updateAmbulance.dto';
import { AmbulanceErrorCode, AmbulanceErrorMessages } from './errors/ambulance-errors.enum';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
          message: AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_ALREADY_EXISTS],
        });
      }
    
      if (driverId) {
        const driver = await this.userRepository.findOne({
          where: { id: driverId },
        });
        if (!driver) {
          throw new NotFoundException({
            code: AmbulanceErrorCode.DRIVER_NOT_FOUND,
            message: AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_NOT_FOUND],
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
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_CREATION_FAILED,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_CREATION_FAILED],
      });
    }
  }
  
  
  
  async findAll(): Promise<Ambulance[]> {
    try {
      return await this.ambulanceRepository.find();
    } catch (error) {
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
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
          message: AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_NOT_FOUND],
        });
      }

      return ambulance;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
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
            message: AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_ALREADY_EXISTS],
          });
        }
      }

      if (dto.driverId) {
        const driver = await this.userRepository.findOne({
          where: { id: dto.driverId },
        });

        if (!driver) {
          throw new NotFoundException({
            code: AmbulanceErrorCode.DRIVER_NOT_FOUND,
            message: AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_NOT_FOUND],
          });
        }
      }

      Object.assign(ambulance, dto);
      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED],
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
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_DELETE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_DELETE_FAILED,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_DELETE_FAILED],
      });
    }
  }

  async findAvailable(): Promise<Ambulance[]> {
    try {
      return await this.ambulanceRepository.find({
        where: { available: true },
      });
    } catch (error) {
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
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
    updates: Array<{ ambulanceId: string; latitude: number; longitude: number }>,
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

  async findNearestAvailableAmbulance(
    location: Location,
  ): Promise<AmbulanceWithDistance | null> {
    const availableAmbulances = await this.findAvailable();

    if (availableAmbulances.length === 0) {
      return null;
    }

    const ambulancesWithLocation = availableAmbulances.filter(
      (amb) => amb.latitude != null && amb.longitude != null,
    );

    if (ambulancesWithLocation.length === 0) {
      return null;
    }

    const ambulanceLocations = ambulancesWithLocation.map((amb) => ({
      latitude: amb.latitude,
      longitude: amb.longitude,
    }));

    const distances = await this.googleMapsService.getDistancesToMultipleDestinations(
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
      ...ambulancesWithLocation[minIndex],
      distance: distances[minIndex].distance,
      duration: distances[minIndex].duration,
    };
  }

  async findNearestAvailableAmbulanceExcluding(
    location: Location,
    excludeAmbulanceIds: string[] = [],
  ): Promise<AmbulanceWithDistance | null> {
    const availableAmbulances = await this.findAvailable();

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

    const distances = await this.googleMapsService.getDistancesToMultipleDestinations(
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
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED],
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
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.AMBULANCE_UPDATE_FAILED],
      });
    }
  }

  async updateLocation(id: string, latitude: number, longitude: number): Promise<Ambulance> {
    try {
      const ambulance = await this.findOne(id);
      ambulance.latitude = latitude;
      ambulance.longitude = longitude;
      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.LOCATION_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.LOCATION_UPDATE_FAILED,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.LOCATION_UPDATE_FAILED],
      });
    }
  }

  async assignDriver(id: string, driverId: string): Promise<Ambulance> {
    try {
      const ambulance = await this.findOne(id);

      const driver = await this.userRepository.findOne({
        where: { id: driverId },
      });

      if (!driver) {
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
          message: AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_ALREADY_ASSIGNED],
        });
      }

      ambulance.driverId = driverId;
      ambulance.lastCallAcceptedAt = new Date(); // Initialize activity timestamp
      return await this.ambulanceRepository.save(ambulance);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_ASSIGNMENT_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.DRIVER_ASSIGNMENT_FAILED,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_ASSIGNMENT_FAILED],
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
      this.logger.error(`${AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_REMOVAL_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: AmbulanceErrorCode.DRIVER_REMOVAL_FAILED,
        message: AmbulanceErrorMessages[AmbulanceErrorCode.DRIVER_REMOVAL_FAILED],
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

  async removeInactiveDrivers(inactivityThresholdHours: number = 5): Promise<string[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - inactivityThresholdHours);

    // Find all ambulances with drivers that haven't accepted calls recently
    const inactiveAmbulances = await this.ambulanceRepository
      .createQueryBuilder('ambulance')
      .where('ambulance.driverId IS NOT NULL')
      .andWhere(
        '(ambulance.lastCallAcceptedAt IS NULL OR ambulance.lastCallAcceptedAt < :threshold)',
        { threshold: thresholdDate }
      )
      .getMany();

    const removedDriverIds: string[] = [];

    for (const ambulance of inactiveAmbulances) {
      if (ambulance.driverId) {
        removedDriverIds.push(ambulance.driverId);
        ambulance.driverId = null;
        ambulance.lastCallAcceptedAt = null;
        await this.ambulanceRepository.save(ambulance);
      }
    }

    return removedDriverIds;
  }
}
