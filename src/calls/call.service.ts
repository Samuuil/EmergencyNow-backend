import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { CreateCallDto } from './dto/createCall.dto';
import { UpdateCallDto } from './dto/updateCall.dto';
import { User } from '../users/entities/user.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { AmbulancesService } from '../ambulances/ambulance.service';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { CallStatus } from '../common/enums/call-status.enum';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callsRepository: Repository<Call>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ambulance)
    private readonly ambulanceRepository: Repository<Ambulance>,
    private readonly ambulancesService: AmbulancesService,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

  async create(dto: CreateCallDto, user: User): Promise<Call> {
    if (!user) throw new BadRequestException('User not found');

    const call = this.callsRepository.create({
      description: dto.description,
      latitude: dto.latitude,
      longitude: dto.longitude,
      user,
      status: CallStatus.PENDING,
    });

    const savedCall = await this.callsRepository.save(call);

    try {
      await this.dispatchNearestAmbulance(savedCall.id);
    } catch (error) {
      console.error('Failed to dispatch ambulance:', error);
    }

    return this.findOne(savedCall.id);
  }

  async dispatchNearestAmbulance(callId: string): Promise<Call> {
    const call = await this.findOne(callId);

    if (call.status !== CallStatus.PENDING) {
      throw new BadRequestException('Call has already been dispatched or completed');
    }

    const nearestAmbulance = await this.ambulancesService.findNearestAvailableAmbulance({
      latitude: call.latitude,
      longitude: call.longitude,
    });

    if (!nearestAmbulance) {
      throw new NotFoundException('No available ambulances found');
    }

    const route = await this.googleMapsService.getRoute(
      {
        latitude: nearestAmbulance.latitude,
        longitude: nearestAmbulance.longitude,
      },
      {
        latitude: call.latitude,
        longitude: call.longitude,
      },
    );

    call.ambulance = nearestAmbulance;
    call.status = CallStatus.DISPATCHED;
    call.routePolyline = route.polyline;
    call.estimatedDistance = route.distance;
    call.estimatedDuration = route.duration;
    call.routeSteps = route.steps;
    call.ambulanceCurrentLatitude = nearestAmbulance.latitude;
    call.ambulanceCurrentLongitude = nearestAmbulance.longitude;
    call.dispatchedAt = new Date();

    await this.ambulancesService.markAsDispatched(nearestAmbulance.id);

    return this.callsRepository.save(call);
  }

  async updateAmbulanceLocation(
    callId: string,
    latitude: number,
    longitude: number,
  ): Promise<Call> {
    const call = await this.findOne(callId);

    if (!call.ambulance) {
      throw new BadRequestException('No ambulance assigned to this call');
    }

    if (call.status === CallStatus.COMPLETED || call.status === CallStatus.CANCELLED) {
      throw new BadRequestException('Call is already completed or cancelled');
    }

    await this.ambulancesService.updateLocation(call.ambulance.id, latitude, longitude);

    call.ambulanceCurrentLatitude = latitude;
    call.ambulanceCurrentLongitude = longitude;

    if (call.status === CallStatus.DISPATCHED || call.status === CallStatus.EN_ROUTE) {
      try {
        const updatedRoute = await this.googleMapsService.getRoute(
          { latitude, longitude },
          { latitude: call.latitude, longitude: call.longitude },
        );

        call.routePolyline = updatedRoute.polyline;
        call.estimatedDistance = updatedRoute.distance;
        call.estimatedDuration = updatedRoute.duration;
        call.routeSteps = updatedRoute.steps;
      } catch (error) {
        console.error('Failed to update route:', error);
      }
    }

    return this.callsRepository.save(call);
  }

  async updateStatus(callId: string, status: CallStatus): Promise<Call> {
    const call = await this.findOne(callId);

    call.status = status;

    if (status === CallStatus.ARRIVED) {
      call.arrivedAt = new Date();
    } else if (status === CallStatus.COMPLETED) {
      call.completedAt = new Date();
      if (call.ambulance) {
        await this.ambulancesService.markAsAvailable(call.ambulance.id);
      }
    } else if (status === CallStatus.EN_ROUTE && !call.dispatchedAt) {
      call.dispatchedAt = new Date();
    }

    return this.callsRepository.save(call);
  }

  async getTrackingData(callId: string): Promise<{
    call: Call;
    currentLocation: { latitude: number; longitude: number } | null;
    route: {
      polyline: string;
      distance: number;
      duration: number;
      steps: any[];
    } | null;
  }> {
    const call = await this.findOne(callId);

    if (!call.ambulance) {
      return {
        call,
        currentLocation: null,
        route: null,
      };
    }

    const currentLocation =
      call.ambulanceCurrentLatitude && call.ambulanceCurrentLongitude
        ? {
            latitude: call.ambulanceCurrentLatitude,
            longitude: call.ambulanceCurrentLongitude,
          }
        : null;

    const route =
      call.routePolyline && call.estimatedDistance && call.estimatedDuration
        ? {
            polyline: call.routePolyline,
            distance: call.estimatedDistance,
            duration: call.estimatedDuration,
            steps: call.routeSteps || [],
          }
        : null;

    return {
      call,
      currentLocation,
      route,
    };
  }

  findAll(): Promise<Call[]> {
    return this.callsRepository.find({ relations: ['user', 'ambulance'] });
  }

  async findOne(id: string): Promise<Call> {
    const call = await this.callsRepository.findOne({
      where: { id },
      relations: ['user', 'ambulance'],
    });

    if (!call) {
      throw new NotFoundException(`Call with ID ${id} not found!`);
    }

    return call;
  }

  async update(id: string, dto: UpdateCallDto): Promise<Call> {
    const call = await this.findOne(id);
    Object.assign(call, dto);
    return this.callsRepository.save(call);
  }

  async remove(id: string): Promise<void> {
    const call = await this.findOne(id);
    
    if (call.ambulance && call.status !== CallStatus.COMPLETED) {
      await this.ambulancesService.markAsAvailable(call.ambulance.id);
    }
    
    await this.callsRepository.remove(call);
  }
}
