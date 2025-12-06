import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ambulance } from './entities/ambulance.entity';
import { User } from '../users/entities/user.entity';
import { GoogleMapsService, Location } from '../common/services/google-maps.service';
import { CreateAmbulanceDto } from './dtos/createAmbulance.dto';
import { UpdateAmbulanceDto } from './dtos/updateAmbulance.dto';

export interface AmbulanceWithDistance extends Ambulance {
  distance: number;
  duration: number;
}

@Injectable()
export class AmbulancesService {
  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepository: Repository<Ambulance>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

  async create(dto: CreateAmbulanceDto, driverId?: string): Promise<Ambulance> {
    const existing = await this.ambulanceRepository.findOne({
      where: { licensePlate: dto.licensePlate },
    });
    if (existing) {
      throw new ConflictException(`Ambulance with license plate ${dto.licensePlate} already exists`);
    }
  
    if (driverId) {
      const driver = await this.userRepository.findOne({
        where: { id: driverId },
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID ${driverId} not found`);
      }
    }
  
    const ambulance = this.ambulanceRepository.create({
      ...dto,
      driverId: driverId ?? null,
      available: true,
    });
  
    return await this.ambulanceRepository.save(ambulance);
  }
  
  
  
  async findAll(): Promise<Ambulance[]> {
    return this.ambulanceRepository.find();
  }

  async findOne(id: string): Promise<Ambulance> {
    const ambulance = await this.ambulanceRepository.findOne({
      where: { id },
    });

    if (!ambulance) {
      throw new NotFoundException(`Ambulance with ID ${id} not found`);
    }

    return ambulance;
  }

  async update(id: string, dto: UpdateAmbulanceDto): Promise<Ambulance> {
    const ambulance = await this.findOne(id);

    if (dto.licensePlate && dto.licensePlate !== ambulance.licensePlate) {
      const existingAmbulance = await this.ambulanceRepository.findOne({
        where: { licensePlate: dto.licensePlate },
      });

      if (existingAmbulance) {
        throw new ConflictException(`Ambulance with license plate ${dto.licensePlate} already exists`);
      }
    }

    if (dto.driverId) {
      const driver = await this.userRepository.findOne({
        where: { id: dto.driverId },
      });

      if (!driver) {
        throw new NotFoundException(`Driver with ID ${dto.driverId} not found`);
      }
    }

    Object.assign(ambulance, dto);
    return await this.ambulanceRepository.save(ambulance);
  }

  async remove(id: string): Promise<void> {
    const ambulance = await this.findOne(id);
    await this.ambulanceRepository.remove(ambulance);
  }

  async findAvailable(): Promise<Ambulance[]> {
    return this.ambulanceRepository.find({
      where: { available: true },
    });
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
    const ambulance = await this.findOne(id);
    ambulance.available = false;
    return this.ambulanceRepository.save(ambulance);
  }

  async markAsAvailable(id: string): Promise<Ambulance> {
    const ambulance = await this.findOne(id);
    ambulance.available = true;
    return this.ambulanceRepository.save(ambulance);
  }

  async updateLocation(id: string, latitude: number, longitude: number): Promise<Ambulance> {
    const ambulance = await this.findOne(id);
    ambulance.latitude = latitude;
    ambulance.longitude = longitude;
    return this.ambulanceRepository.save(ambulance);
  }

  async assignDriver(id: string, driverId: string): Promise<Ambulance> {
    const ambulance = await this.findOne(id);

    const driver = await this.userRepository.findOne({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    const ambulanceWithDriver = await this.ambulanceRepository.findOne({
      where: { driverId },
    });

    if (ambulanceWithDriver && ambulanceWithDriver.id !== id) {
      throw new BadRequestException(`Driver is already assigned to another ambulance`);
    }

    ambulance.driverId = driverId;
    return await this.ambulanceRepository.save(ambulance);
  }

  async removeDriver(id: string): Promise<Ambulance> {
    const ambulance = await this.findOne(id);
    ambulance.driverId = null;
    return await this.ambulanceRepository.save(ambulance);
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
}
