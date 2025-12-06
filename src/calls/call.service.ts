import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
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
import { DriverGateway } from '../realtime/driver.gateway';

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
    @Inject(forwardRef(() => DriverGateway))
    private readonly driverGateway: DriverGateway,
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
      await this.proposeToNearestDriver(savedCall.id);
    } catch (error) {
      console.error('Failed to propose call to driver:', error);
    }

    return this.findOne(savedCall.id);
  }

  async dispatchNearestAmbulance(callId: string): Promise<Call> {
    // For backward compatibility with the controller route: trigger offer flow
    const call = await this.findOne(callId);
    if (call.status === CallStatus.COMPLETED || call.status === CallStatus.CANCELLED) {
      throw new BadRequestException('Call is already completed or cancelled');
    }
    await this.proposeToNearestDriver(callId);
    return call;
  }

  private async proposeToNearestDriver(callId: string, skipLocationRefresh = false): Promise<void> {
    const call = await this.findOne(callId);
    if (call.status !== CallStatus.PENDING) return;

    // Refresh locations from all available drivers before selecting the nearest
    // Skip refresh if this is a retry after rejection (locations were just fetched)
    if (!skipLocationRefresh) {
      try {
        await this.driverGateway.refreshAvailableAmbulanceLocations(5000);
      } catch (error) {
        console.error('Failed to refresh ambulance locations:', error);
        // Continue with potentially stale locations rather than failing the call
      }
    }

    // Exclude already rejected ambulances
    const excluded = this.driverGateway.getRejectedAmbulanceIds(callId);

    // Find nearest available ambulance not yet rejected and with an assigned driver
    let candidate = await this.ambulancesService.findNearestAvailableAmbulanceExcluding(
      { latitude: call.latitude, longitude: call.longitude },
      excluded,
    );

    while (
      candidate && (
        !candidate.driverId || !this.driverGateway.isDriverOnline(candidate.driverId)
      )
    ) {
      // no driver assigned or driver offline, skip this ambulance
      excluded.push(candidate.id);
      candidate = await this.ambulancesService.findNearestAvailableAmbulanceExcluding(
        { latitude: call.latitude, longitude: call.longitude },
        excluded,
      );
    }

    if (!candidate) {
      // No available ambulances/drivers, keep call pending
      return;
    }

    this.driverGateway.setPendingAmbulance(callId, candidate.id);

    // Send lightweight offer with distance/duration.
    // IMPORTANT: If Google routing fails (e.g. "No route available"), we must still
    // send the offer so the driver sees the popup. In that case we fall back to
    // distance/duration = 0.
    let distance = 0;
    let duration = 0;
    try {
      const res = await this.googleMapsService.getDistanceAndDuration(
        { latitude: candidate.latitude!, longitude: candidate.longitude! },
        { latitude: call.latitude, longitude: call.longitude },
      );
      distance = res.distance;
      duration = res.duration;
    } catch (error) {
      // Keep logging for debugging but do NOT stop the offer flow
      console.error('getDistanceAndDuration failed, sending offer without ETA:', error);
    }

    this.driverGateway.offerCall({
      callId: call.id,
      description: call.description,
      latitude: call.latitude,
      longitude: call.longitude,
      ambulanceId: candidate.id,
      driverId: candidate.driverId!,
      distance,
      duration,
    });
  }

  async handleDriverResponse(callId: string, driverId: string, accept: boolean): Promise<void> {
    const call = await this.findOne(callId);

    // Validate driver corresponds to pending ambulance
    const ambulance = await this.ambulancesService.findByDriver(driverId);
    if (!ambulance) return; // driver has no ambulance

    const pendingAmbulanceId = this.driverGateway.getPendingAmbulanceId(callId);
    if (!pendingAmbulanceId || pendingAmbulanceId !== ambulance.id) {
      return; // stale/invalid response
    }

    if (!accept) {
      // mark rejection and try next candidate
      // Skip location refresh since we just did one for this call
      this.driverGateway.addRejection(callId, ambulance.id);
      await this.proposeToNearestDriver(callId, true);
      return;
    }

    // Accept: assign ambulance, compute route, update status, notify driver
    const route = await this.googleMapsService.getRoute(
      { latitude: ambulance.latitude!, longitude: ambulance.longitude! },
      { latitude: call.latitude, longitude: call.longitude },
    );

    call.ambulance = ambulance;
    call.status = CallStatus.DISPATCHED;
    call.routePolyline = route.polyline;
    call.estimatedDistance = route.distance;
    call.estimatedDuration = route.duration;
    call.routeSteps = route.steps;
    call.ambulanceCurrentLatitude = ambulance.latitude!;
    call.ambulanceCurrentLongitude = ambulance.longitude!;
    call.dispatchedAt = new Date();

    await this.ambulancesService.markAsDispatched(ambulance.id);
    await this.callsRepository.save(call);

    this.driverGateway.clearOffer(callId);
    this.driverGateway.sendRouteToDriver(driverId, {
      callId: call.id,
      route: {
        polyline: call.routePolyline!,
        distance: call.estimatedDistance!,
        duration: call.estimatedDuration!,
        steps: call.routeSteps || [],
      },
    });
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
