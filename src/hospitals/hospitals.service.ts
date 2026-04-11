import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  HospitalErrorCode,
  HospitalErrorMessages,
} from './errors/hospital-errors.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate, PaginateQuery, FilterOperator } from 'nestjs-paginate';
import { Hospital } from './entities/hospital.entity';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import {
  GoogleMapsService,
  Location,
} from '../common/services/google-maps.service';

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
      this.logger.error(
        `${HospitalErrorMessages[HospitalErrorCode.HOSPITAL_CREATION_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: HospitalErrorCode.HOSPITAL_CREATION_FAILED,
        message:
          HospitalErrorMessages[HospitalErrorCode.HOSPITAL_CREATION_FAILED],
      });
    }
  }

  async findAll(query: PaginateQuery) {
    try {
      return paginate(query, this.hospitalRepository, {
        sortableColumns: ['id', 'name', 'address', 'createdAt'],
        defaultSortBy: [['name', 'ASC']],
        searchableColumns: ['name', 'address'],
        filterableColumns: {
          name: [FilterOperator.ILIKE],
          address: [FilterOperator.ILIKE],
          isActive: [FilterOperator.EQ],
        },
        where: { isActive: true },
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(
        `${HospitalErrorMessages[HospitalErrorCode.DATABASE_ERROR]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: HospitalErrorCode.DATABASE_ERROR,
        message: HospitalErrorMessages[HospitalErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findAllList(): Promise<Hospital[]> {
    try {
      return await this.hospitalRepository.find({
        where: { isActive: true },
      });
    } catch (error) {
      this.logger.error(
        `${HospitalErrorMessages[HospitalErrorCode.DATABASE_ERROR]}: ${error}`,
      );
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
      this.logger.error(
        `${HospitalErrorMessages[HospitalErrorCode.DATABASE_ERROR]}: ${error}`,
      );
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
      this.logger.error(
        `${HospitalErrorMessages[HospitalErrorCode.HOSPITAL_UPDATE_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: HospitalErrorCode.HOSPITAL_UPDATE_FAILED,
        message:
          HospitalErrorMessages[HospitalErrorCode.HOSPITAL_UPDATE_FAILED],
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
      this.logger.error(
        `${HospitalErrorMessages[HospitalErrorCode.HOSPITAL_DELETE_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: HospitalErrorCode.HOSPITAL_DELETE_FAILED,
        message:
          HospitalErrorMessages[HospitalErrorCode.HOSPITAL_DELETE_FAILED],
      });
    }
  }

  async findNearestHospitals(
    location: Location,
    limit: number = 10,
  ): Promise<HospitalWithDistance[]> {
    try {
      const hospitals = await this.findAllList();

      if (hospitals.length === 0) {
        return [];
      }

      const hospitalLocations = hospitals.map((h) => ({
        latitude: h.latitude,
        longitude: h.longitude,
      }));

      let distances: { distance: number; duration: number }[] = [];

      try {
        distances =
          await this.googleMapsService.getDistancesToMultipleDestinations(
            location,
            hospitalLocations,
          );
      } catch (error) {
        const err = error as Error;
        this.logger.warn(
          'Google distance matrix failed, using fallback distances',
          err.message || 'Unknown error',
        );
        distances = hospitalLocations.map(() => ({
          distance: Infinity,
          duration: Infinity,
        }));
      }

      const hospitalsWithDistances: HospitalWithDistance[] = hospitals.map(
        (hospital, index) => ({
          ...hospital,
          distance: distances[index]?.distance ?? Infinity,
          duration: distances[index]?.duration ?? Infinity,
        }),
      );

      return hospitalsWithDistances
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(
        `${HospitalErrorMessages[HospitalErrorCode.DISTANCE_CALCULATION_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: HospitalErrorCode.DISTANCE_CALCULATION_FAILED,
        message:
          HospitalErrorMessages[HospitalErrorCode.DISTANCE_CALCULATION_FAILED],
      });
    }
  }

  async syncHospitalsFromGooglePlaces(
    location: Location,
    radius: number = 20000,
  ): Promise<void> {
    try {
      const places = await this.googleMapsService.findHospitalsByTextSearch(
        location,
        radius,
      );
      this.logger.log(`Found ${places.length} hospitals from Google Places`);

      const existingPlaceIds = new Set(
        (
          await this.hospitalRepository.find({
            where: { placeId: In(places.map((p) => p.placeId)) },
            select: ['placeId'],
          })
        ).map((h) => h.placeId),
      );

      const newHospitals = places
        .filter((p) => !existingPlaceIds.has(p.placeId))
        .map((p) =>
          this.hospitalRepository.create({
            name: p.name || 'Unknown Hospital',
            address: p.address,
            latitude: p.location.lat,
            longitude: p.location.lng,
            placeId: p.placeId,
            isActive: true,
          }),
        );

      if (newHospitals.length > 0) {
        await this.hospitalRepository.save(newHospitals);
        this.logger.log(`Inserted ${newHospitals.length} new hospital(s)`);
      }
    } catch (error) {
      this.logger.error(
        `${HospitalErrorMessages[HospitalErrorCode.GOOGLE_PLACES_SYNC_FAILED]}: ${error}`,
      );
      throw new InternalServerErrorException({
        code: HospitalErrorCode.GOOGLE_PLACES_SYNC_FAILED,
        message:
          HospitalErrorMessages[HospitalErrorCode.GOOGLE_PLACES_SYNC_FAILED],
      });
    }
  }
}
