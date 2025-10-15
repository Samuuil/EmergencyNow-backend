import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ambulance } from './entities/ambulance.entity';
import { GoogleMapsService, Location } from '../common/services/google-maps.service';

export interface AmbulanceWithDistance extends Ambulance {
  distance: number;
  duration: number;
}

@Injectable()
export class AmbulancesService {
  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepository: Repository<Ambulance>,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

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

  async findAvailable(): Promise<Ambulance[]> {
    return this.ambulanceRepository.find({
      where: { available: true },
    });
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
}
