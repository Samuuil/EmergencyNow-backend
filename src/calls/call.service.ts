import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery, FilterOperator } from 'nestjs-paginate';
import { Call } from './entities/call.entity';
import { CreateCallDto } from './dto/createCall.dto';
import { UpdateCallDto } from './dto/updateCall.dto';
import { User } from '../users/entities/user.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { AmbulancesService } from '../ambulances/ambulance.service';
import { HospitalsService, HospitalWithDistance } from '../hospitals/hospitals.service';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { CallStatus } from '../common/enums/call-status.enum';
import { DriverGateway } from '../realtime/driver.gateway';
import { UserGateway } from '../realtime/user.gateway';
import { MailService } from '../auth/services/mail.service';
import { ContactsService } from '../contacts/contact.service';

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
    private readonly hospitalsService: HospitalsService,
    private readonly googleMapsService: GoogleMapsService,
    @Inject(forwardRef(() => DriverGateway))
    private readonly driverGateway: DriverGateway,
    @Inject(forwardRef(() => UserGateway))
    private readonly userGateway: UserGateway,
    private readonly mailService: MailService,
    private readonly contactsService: ContactsService,
  ) {}

  async create(dto: CreateCallDto, user: User): Promise<Call> {
    if (!user) throw new BadRequestException('User not found');

    const call = this.callsRepository.create({
      description: dto.description,
      latitude: dto.latitude,
      longitude: dto.longitude,
      user,
      userEgn: dto.userEgn,
      status: CallStatus.PENDING,
    });

    const savedCall = await this.callsRepository.save(call);

    try {
      await this.proposeToNearestDriver(savedCall.id);
    } catch (error) {
      console.error('Failed to propose call to driver:', error);
    }

    // Notify emergency contacts about the call (async, don't block)
    this.notifyEmergencyContactsAboutCall(user, savedCall).catch((err) =>
      console.error('Failed to notify emergency contacts:', err),
    );

    return this.findOne(savedCall.id);
  }

  async dispatchNearestAmbulance(callId: string): Promise<Call> {
    const call = await this.findOne(callId);
    if (call.status === CallStatus.COMPLETED || call.status === CallStatus.CANCELLED) {
      throw new BadRequestException('Call is already completed or cancelled');
    }
    await this.proposeToNearestDriver(callId);
    return call;
  }

  private async proposeToNearestDriver(callId: string, skipLocationRefresh = false): Promise<void> {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['user', 'user.stateArchive', 'ambulance'],
    });
    
    if (!call) return;

    if (!skipLocationRefresh) {
      try {
        await this.driverGateway.refreshAvailableAmbulanceLocations(5000);
      } catch (error) {
        console.error('Failed to refresh ambulance locations:', error);
      }
    }

    const excluded = this.driverGateway.getRejectedAmbulanceIds(callId);

    if (call.user?.stateArchive?.egn) {
      const callerEgn = call.user.stateArchive.egn;
      
      const ambulancesWithMatchingDriverEgn = await this.ambulanceRepository
        .createQueryBuilder('ambulance')
        .innerJoin(User, 'driver', 'ambulance.driverId = driver.id')
        .innerJoin('driver.stateArchive', 'stateArchive')
        .where('ambulance.available = :available', { available: true })
        .andWhere('ambulance.driverId IS NOT NULL')
        .andWhere('stateArchive.egn = :callerEgn', { callerEgn })
        .select('ambulance.id')
        .getMany();

      ambulancesWithMatchingDriverEgn.forEach((amb) => {
        excluded.push(amb.id);
      });
    }

    let candidate = await this.ambulancesService.findNearestAvailableAmbulanceExcluding(
      { latitude: call.latitude, longitude: call.longitude },
      excluded,
    );

    while (
      candidate && (
        !candidate.driverId || !this.driverGateway.isDriverOnline(candidate.driverId)
      )
    ) {
      excluded.push(candidate.id);
      candidate = await this.ambulancesService.findNearestAvailableAmbulanceExcluding(
        { latitude: call.latitude, longitude: call.longitude },
        excluded,
      );
    }

    if (!candidate) {
      return;
    }

    this.driverGateway.setPendingAmbulance(callId, candidate.id);

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

    const ambulance = await this.ambulancesService.findByDriver(driverId);
    if (!ambulance) return;

    const pendingAmbulanceId = this.driverGateway.getPendingAmbulanceId(callId);
    if (!pendingAmbulanceId || pendingAmbulanceId !== ambulance.id) {
      return;
    }

    if (!accept) {
      this.driverGateway.addRejection(callId, ambulance.id);
      await this.proposeToNearestDriver(callId, true);
      return;
    }

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
    await this.ambulancesService.updateLastCallAcceptedAt(ambulance.id);
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

    if (call.user?.id) {
      this.userGateway.notifyCallDispatched(call.user.id, {
        callId: call.id,
        ambulanceId: ambulance.id,
        ambulanceLocation: {
          latitude: call.ambulanceCurrentLatitude!,
          longitude: call.ambulanceCurrentLongitude!,
        },
        route: {
          polyline: call.routePolyline!,
          distance: call.estimatedDistance!,
          duration: call.estimatedDuration!,
          steps: call.routeSteps || [],
        },
      });
    }
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

    const savedCall = await this.callsRepository.save(call);

    if (call.user?.id) {
      this.userGateway.notifyLocationUpdate(call.user.id, {
        callId: call.id,
        ambulanceLocation: {
          latitude: call.ambulanceCurrentLatitude!,
          longitude: call.ambulanceCurrentLongitude!,
        },
        route:
          call.routePolyline && call.estimatedDistance && call.estimatedDuration
            ? {
                polyline: call.routePolyline,
                distance: call.estimatedDistance,
                duration: call.estimatedDuration,
                steps: call.routeSteps || [],
              }
            : null,
      });
    }

    return savedCall;
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

    const savedCall = await this.callsRepository.save(call);

    if (call.user?.id) {
      this.userGateway.notifyStatusChange(call.user.id, {
        callId: call.id,
        status: call.status,
      });
    }

    return savedCall;
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

  findAll(query: PaginateQuery) {
    return paginate(query, this.callsRepository, {
      sortableColumns: ['status', 'createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      searchableColumns: ['description'],
      filterableColumns: {
        status: [FilterOperator.EQ],
      },
      relations: ['user', 'ambulance'],
      defaultLimit: 10,
      maxLimit: 100,
    });
  }

  findByUser(userId: string, query: PaginateQuery) {
    const qb = this.callsRepository
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.user', 'user')
      .leftJoinAndSelect('call.ambulance', 'ambulance')
      .where('user.id = :userId', { userId });

    return paginate(query, qb, {
      sortableColumns: ['status', 'createdAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      searchableColumns: ['description'],
      filterableColumns: {
        status: [FilterOperator.EQ],
      },
      defaultLimit: 10,
      maxLimit: 100,
    });
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


  async getHospitalsForCall(
    callId: string,
    driverLatitude: number,
    driverLongitude: number,
  ): Promise<HospitalWithDistance[]> {
    const call = await this.findOne(callId);

    if (call.status !== CallStatus.ARRIVED) {
      throw new BadRequestException('Hospitals can only be viewed after arriving at patient location');
    }

    return this.hospitalsService.findNearestHospitals(
      { latitude: driverLatitude, longitude: driverLongitude },
      50,
    );
  }

  async selectHospitalForCall(
    callId: string,
    hospitalId: string,
    driverLatitude: number,
    driverLongitude: number,
  ): Promise<Call> {
    const call = await this.findOne(callId);

    if (call.status !== CallStatus.ARRIVED) {
      throw new BadRequestException('Hospital can only be selected after arriving at patient location');
    }

    const hospital = await this.hospitalsService.findOne(hospitalId);

    const route = await this.googleMapsService.getRoute(
      { latitude: driverLatitude, longitude: driverLongitude },
      { latitude: hospital.latitude, longitude: hospital.longitude },
    );

    call.selectedHospitalId = hospital.id;
    call.selectedHospitalName = hospital.name;
    call.hospitalRoutePolyline = route.polyline;
    call.hospitalRouteDistance = route.distance;
    call.hospitalRouteDuration = route.duration;
    call.hospitalRouteSteps = route.steps;

    call.ambulanceCurrentLatitude = driverLatitude;
    call.ambulanceCurrentLongitude = driverLongitude;

    const savedCall = await this.callsRepository.save(call);

    this.notifyEmergencyContactsAboutHospital(call, hospital.name, route.duration).catch((err) =>
      console.error('Failed to notify emergency contacts about hospital:', err),
    );

    return savedCall;
  }

  async getHospitalRouteData(callId: string): Promise<{
    hospital: { id: string; name: string } | null;
    route: {
      polyline: string;
      distance: number;
      duration: number;
      steps: any[];
    } | null;
  }> {
    const call = await this.findOne(callId);

    if (!call.selectedHospitalId) {
      return { hospital: null, route: null };
    }

    return {
      hospital: {
        id: call.selectedHospitalId,
        name: call.selectedHospitalName,
      },
      route: call.hospitalRoutePolyline
        ? {
            polyline: call.hospitalRoutePolyline,
            distance: call.hospitalRouteDistance,
            duration: call.hospitalRouteDuration,
            steps: call.hospitalRouteSteps || [],
          }
        : null,
    };
  }

  private async notifyEmergencyContactsAboutCall(user: User, call: Call): Promise<void> {
    const contacts = await this.contactsService.getUserContactsList(user.id);

    if (contacts.length === 0) {
      console.log(`No emergency contacts found for user ${user.id}`);
      return;
    }

    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['stateArchive'],
    });
    const userName = fullUser?.stateArchive?.fullName || fullUser?.stateArchive?.email || 'A user';

    const emailPromises = contacts
      .filter((contact) => contact.email)
      .map((contact) =>
        this.mailService.sendEmergencyAlert(
          contact.email!,
          contact.name,
          userName,
          call.latitude,
          call.longitude,
          call.description,
        ),
      );

    await Promise.all(emailPromises);

    console.log(
      `Emergency alerts sent to ${emailPromises.length} contact(s) for user ${user.id}`,
    );
  }

  private async notifyEmergencyContactsAboutHospital(
    call: Call,
    hospitalName: string,
    estimatedDuration?: number,
  ): Promise<void> {
    if (!call.user) {
      console.log(`No user associated with call ${call.id}, skipping hospital notification`);
      return;
    }

    const contacts = await this.contactsService.getUserContactsList(call.user.id);

    if (contacts.length === 0) {
      console.log(`No emergency contacts found for user ${call.user.id}`);
      return;
    }

    const fullUser = await this.userRepository.findOne({
      where: { id: call.user.id },
      relations: ['stateArchive'],
    });
    const userName = fullUser?.stateArchive?.fullName || fullUser?.stateArchive?.email || 'Your contact';

    const emailPromises = contacts
      .filter((contact) => contact.email)
      .map((contact) =>
        this.mailService.sendHospitalUpdate(
          contact.email!,
          contact.name,
          userName,
          hospitalName,
          estimatedDuration,
        ),
      );

    await Promise.all(emailPromises);

    console.log(
      `Hospital updates sent to ${emailPromises.length} contact(s) for user ${call.user.id}`,
    );
  }
}
