import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital } from './entities/hospital.entity';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { GoogleMapsService, Location } from '../common/services/google-maps.service';

export interface HospitalWithDistance extends Hospital {
  distance: number;
  duration: number;
}

@Injectable()
export class HospitalsService {
  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalRepository: Repository<Hospital>,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

  async create(dto: CreateHospitalDto): Promise<Hospital> {
    const hospital = this.hospitalRepository.create(dto);
    return await this.hospitalRepository.save(hospital);
  }

  async findAll(): Promise<Hospital[]> {
    return await this.hospitalRepository.find({
      where: { isActive: true },
    });
  }

  async findOne(id: string): Promise<Hospital> {
    const hospital = await this.hospitalRepository.findOne({
      where: { id },
    });

    if (!hospital) {
      throw new NotFoundException(`Hospital with ID ${id} not found`);
    }

    return hospital;
  }

  async update(id: string, dto: UpdateHospitalDto): Promise<Hospital> {
    const hospital = await this.findOne(id);
    Object.assign(hospital, dto);
    return await this.hospitalRepository.save(hospital);
  }

  async remove(id: string): Promise<void> {
    const hospital = await this.findOne(id);
    await this.hospitalRepository.remove(hospital);
  }

  async findNearestHospitals(
    location: Location,
    limit: number = 10,
  ): Promise<HospitalWithDistance[]> {
    const hospitals = await this.findAll();

    if (hospitals.length === 0) {
      return [];
    }

    const hospitalLocations = hospitals.map((h) => ({
      latitude: h.latitude,
      longitude: h.longitude,
    }));

    let distances: { distance: number; duration: number }[] = [];

    try {
      distances = await this.googleMapsService.getDistancesToMultipleDestinations(
        location,
        hospitalLocations,
      );
    } catch (error) {
      // If Google distance matrix fails, fall back to returning hospitals
      // without dropping them. Distances will remain Infinity and will be
      // sorted to the end of the list.
      distances = hospitalLocations.map(() => ({ distance: Infinity, duration: Infinity }));
    }

    const hospitalsWithDistances: HospitalWithDistance[] = hospitals.map((hospital, index) => ({
      ...hospital,
      distance: distances[index]?.distance ?? Infinity,
      duration: distances[index]?.duration ?? Infinity,
    }));

    return hospitalsWithDistances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  async syncHospitalsFromGooglePlaces(location: Location, radius: number = 20000): Promise<void> {
    const places = await this.googleMapsService.findHospitalsByTextSearch(location, radius);
    console.log(places);
    for (const place of places) {
      const existing = await this.hospitalRepository.findOne({
        where: { placeId: place.placeId },
      });
  
      if (!existing) {
        await this.create({
          name: place.name || "Unknown Hospital",
          address: place.address,
          latitude: place.location.lat,
          longitude: place.location.lng,
          placeId: place.placeId,
          isActive: true,
        });
      }
    }
  }
  
}
