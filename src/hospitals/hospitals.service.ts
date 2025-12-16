import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { HospitalErrorCode, HospitalErrorMessages } from './errors/hospital-errors.enum';
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
  private readonly logger = new Logger(HospitalsService.name);

  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalRepository: Repository<Hospital>,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

  async create(dto: CreateHospitalDto): Promise<Hospital> {
    try {
      const hospital = this.hospitalRepository.create(dto);
      return await this.hospitalRepository.save(hospital);
    } catch (error) {
      this.logger.error(`${HospitalErrorMessages[HospitalErrorCode.HOSPITAL_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: HospitalErrorCode.HOSPITAL_CREATION_FAILED,
        message: HospitalErrorMessages[HospitalErrorCode.HOSPITAL_CREATION_FAILED],
      });
    }
  }

  async findAll(): Promise<Hospital[]> {
    try {
      return await this.hospitalRepository.find({
        where: { isActive: true },
      });
    } catch (error) {
      this.logger.error(`${HospitalErrorMessages[HospitalErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: HospitalErrorCode.DATABASE_ERROR,
        message: HospitalErrorMessages[HospitalErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findOne(id: string): Promise<Hospital> {
    try {
      const hospital = await this.hospitalRepository.findOne({
        where: { id },
      });

      if (!hospital) {
        throw new NotFoundException({
          code: HospitalErrorCode.HOSPITAL_NOT_FOUND,
          message: HospitalErrorMessages[HospitalErrorCode.HOSPITAL_NOT_FOUND],
        });
      }

      return hospital;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${HospitalErrorMessages[HospitalErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: HospitalErrorCode.DATABASE_ERROR,
        message: HospitalErrorMessages[HospitalErrorCode.DATABASE_ERROR],
      });
    }
  }

  async update(id: string, dto: UpdateHospitalDto): Promise<Hospital> {
    try {
      const hospital = await this.findOne(id);
      Object.assign(hospital, dto);
      return await this.hospitalRepository.save(hospital);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${HospitalErrorMessages[HospitalErrorCode.HOSPITAL_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: HospitalErrorCode.HOSPITAL_UPDATE_FAILED,
        message: HospitalErrorMessages[HospitalErrorCode.HOSPITAL_UPDATE_FAILED],
      });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const hospital = await this.findOne(id);
      await this.hospitalRepository.remove(hospital);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${HospitalErrorMessages[HospitalErrorCode.HOSPITAL_DELETE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: HospitalErrorCode.HOSPITAL_DELETE_FAILED,
        message: HospitalErrorMessages[HospitalErrorCode.HOSPITAL_DELETE_FAILED],
      });
    }
  }

  async findNearestHospitals(
    location: Location,
    limit: number = 10,
  ): Promise<HospitalWithDistance[]> {
    try {
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
        this.logger.warn('Google distance matrix failed, using fallback distances', error.message);
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
    } catch (error) {
      this.logger.error(`${HospitalErrorMessages[HospitalErrorCode.DISTANCE_CALCULATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: HospitalErrorCode.DISTANCE_CALCULATION_FAILED,
        message: HospitalErrorMessages[HospitalErrorCode.DISTANCE_CALCULATION_FAILED],
      });
    }
  }

  async syncHospitalsFromGooglePlaces(location: Location, radius: number = 20000): Promise<void> {
    try {
      const places = await this.googleMapsService.findHospitalsByTextSearch(location, radius);
      this.logger.log(`Found ${places.length} hospitals from Google Places`);
      
      for (const place of places) {
        try {
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
        } catch (error) {
          this.logger.warn(`Failed to sync hospital: ${place.name}`, error.message);
          // Continue with next hospital
        }
      }
    } catch (error) {
      this.logger.error(`${HospitalErrorMessages[HospitalErrorCode.GOOGLE_PLACES_SYNC_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: HospitalErrorCode.GOOGLE_PLACES_SYNC_FAILED,
        message: HospitalErrorMessages[HospitalErrorCode.GOOGLE_PLACES_SYNC_FAILED],
      });
    }
  }
  
}
