import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Call } from '../calls/entities/call.entity';
import { StateArchive } from '../state-archive/entities/state-archive.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { CallStatus } from '../common/enums/call-status.enum';
import { AmbulancesService } from '../ambulances/ambulance.service';
import { DispatcherGateway } from '../realtime/dispatcher.gateway';
import { DriverGateway } from '../realtime/driver.gateway';
import { UserGateway } from '../realtime/user.gateway';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { NotificationService } from '../notification/notification.service';
import { DispatcherCallOfferDto } from './dto/dispatcher-call-offer.dto';
import { DispatcherAmbulanceSummaryDto } from './dto/dispatcher-ambulance-summary.dto';

export const MAX_CALLS_PER_DISPATCHER = 5;
export const DISPATCHER_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class DispatcherService implements OnModuleDestroy {
  private readonly logger = new Logger(DispatcherService.name);

  // dispatcherId -> Set<callId> they currently hold
  private readonly dispatcherLoads = new Map<string, Set<string>>();

  // callId -> Set<dispatcherId> that have already been tried for this call
  private readonly callSeenDispatchers = new Map<string, Set<string>>();

  // callId -> 5-min reassignment timer
  private readonly callTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Call)
    private readonly callsRepository: Repository<Call>,
    @InjectRepository(StateArchive)
    private readonly stateArchiveRepo: Repository<StateArchive>,
    private readonly ambulancesService: AmbulancesService,
    private readonly dispatcherGateway: DispatcherGateway,
    private readonly driverGateway: DriverGateway,
    private readonly userGateway: UserGateway,
    private readonly googleMapsService: GoogleMapsService,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleDestroy(): void {
    for (const timer of this.callTimers.values()) clearTimeout(timer);
    this.callTimers.clear();
  }

  // ───────────────────────── Public API ─────────────────────────

  async routeCall(call: Call): Promise<void> {
    const callerUserId = call.user?.id ?? null;
    const dispatcherId = this.pickDispatcher(call.id, callerUserId);
    if (!dispatcherId) {
      await this.notifyUserAwaitingDispatcher(call.id);
      this.logger.log(
        `Call ${call.id} queued: no eligible dispatcher available`,
      );
      return;
    }
    await this.assignCallToDispatcher(call.id, dispatcherId);
  }

  async releaseCall(callId: string, reason: string): Promise<void> {
    this.cancelTimer(callId);
    const dispatcherId = this.findHoldingDispatcher(callId);
    if (dispatcherId) {
      this.removeCallFromDispatcher(dispatcherId, callId);
      this.dispatcherGateway.notifyCallReleased(dispatcherId, {
        callId,
        reason,
      });
    }
    this.callSeenDispatchers.delete(callId);
    await this.cancelOfferedDriverFcm(callId);
    this.driverGateway.clearOffer(callId);
    await this.callsRepository.update(
      { id: callId },
      { assignedDispatcherId: null, dispatcherAssignedAt: null },
    );
  }

  async notifyCallCancelled(callId: string): Promise<void> {
    const dispatcherId = this.findHoldingDispatcher(callId);
    if (dispatcherId) {
      this.dispatcherGateway.notifyCallCancelled(dispatcherId, { callId });
      this.removeCallFromDispatcher(dispatcherId, callId);
      void this.drainQueueForDispatcher(dispatcherId);
    }
    this.cancelTimer(callId);
    this.callSeenDispatchers.delete(callId);
    await this.cancelOfferedDriverFcm(callId);
  }

  async onDriverAccepted(callId: string, ambulanceId: string): Promise<void> {
    this.cancelTimer(callId);
    const dispatcherId = this.findHoldingDispatcher(callId);
    if (dispatcherId) {
      this.removeCallFromDispatcher(dispatcherId, callId);
      this.dispatcherGateway.notifyDriverAccepted(dispatcherId, {
        callId,
        ambulanceId,
      });
      void this.drainQueueForDispatcher(dispatcherId);
    }
    this.callSeenDispatchers.delete(callId);
  }

  async onDriverRejected(callId: string, ambulanceId: string): Promise<void> {
    const dispatcherId = this.findHoldingDispatcher(callId);
    if (!dispatcherId) return;
    const ambulances = await this.buildAmbulanceList();
    this.dispatcherGateway.notifyDriverRejected(dispatcherId, {
      callId,
      ambulanceId,
      ambulances,
    });
  }

  async handleAssignAmbulanceRequest(
    dispatcherId: string,
    callId: string,
    ambulanceId: string,
  ): Promise<void> {
    if (!this.dispatcherHoldsCall(dispatcherId, callId)) {
      throw new ForbiddenException(
        'You are not assigned to this call',
      );
    }

    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['user', 'user.stateArchive'],
    });
    if (!call) throw new NotFoundException(`Call ${callId} not found`);
    if (
      call.status === CallStatus.COMPLETED ||
      call.status === CallStatus.CANCELLED ||
      call.status === CallStatus.DISPATCHED ||
      call.status === CallStatus.EN_ROUTE ||
      call.status === CallStatus.ARRIVED
    ) {
      throw new BadRequestException('Call is no longer pending');
    }

    const ambulance = await this.ambulancesService.findOne(ambulanceId);
    if (
      !ambulance.available ||
      !ambulance.driverId ||
      ambulance.latitude == null ||
      ambulance.longitude == null
    ) {
      const ambulances = await this.buildAmbulanceList();
      this.dispatcherGateway.notifyAmbulanceUnavailable(dispatcherId, {
        callId,
        ambulanceId,
        ambulances,
      });
      throw new BadRequestException('Ambulance is no longer available');
    }
    const driverOnline = this.driverGateway.isDriverOnline(ambulance.driverId);

    const route = await this.googleMapsService.getRoute(
      { latitude: ambulance.latitude, longitude: ambulance.longitude },
      { latitude: call.latitude, longitude: call.longitude },
    );

    this.driverGateway.setPendingAmbulance(callId, ambulance.id);
    this.driverGateway.offerCall({
      callId: call.id,
      description: call.description,
      latitude: call.latitude,
      longitude: call.longitude,
      ambulanceId: ambulance.id,
      driverId: ambulance.driverId,
      distance: route.distance,
      duration: route.duration,
    });

    void this.notificationService.sendCallOffer(ambulance.driverId, {
      callId: call.id,
      description: call.description,
      latitude: call.latitude,
      longitude: call.longitude,
      distance: route.distance,
      duration: route.duration,
    });

    this.logger.log(
      `Dispatcher ${dispatcherId} offered call ${callId} to ambulance ${ambulanceId} (driver ${ambulance.driverId}, socket=${driverOnline ? 'online' : 'offline, FCM-only'})`,
    );
  }

  async getCallsForDispatcher(
    dispatcherId: string,
  ): Promise<DispatcherCallOfferDto[]> {
    const calls = await this.callsRepository.find({
      where: { assignedDispatcherId: dispatcherId, status: CallStatus.PENDING },
      relations: ['user', 'user.stateArchive', 'user.profile'],
      order: { createdAt: 'ASC' },
    });
    return Promise.all(calls.map((call) => this.toCallOfferPayload(call)));
  }

  async getAmbulanceListForDispatchers(): Promise<DispatcherAmbulanceSummaryDto[]> {
    return this.buildAmbulanceList();
  }

  // ───────────────────────── Event listeners ─────────────────────────

  @OnEvent('dispatcher.connected')
  async onDispatcherConnected(event: { dispatcherId: string }): Promise<void> {
    if (!this.dispatcherLoads.has(event.dispatcherId)) {
      this.dispatcherLoads.set(event.dispatcherId, new Set());
    }
    await this.reattachExistingCallsOnConnect(event.dispatcherId);
    await this.drainQueueForDispatcher(event.dispatcherId);
  }

  @OnEvent('dispatcher.disconnected')
  async onDispatcherDisconnected(event: {
    dispatcherId: string;
  }): Promise<void> {
    const held = this.dispatcherLoads.get(event.dispatcherId);
    if (!held || held.size === 0) {
      this.dispatcherLoads.delete(event.dispatcherId);
      return;
    }
    const callIds = Array.from(held);
    this.dispatcherLoads.delete(event.dispatcherId);
    for (const callId of callIds) {
      this.cancelTimer(callId);
      await this.callsRepository.update(
        { id: callId, assignedDispatcherId: event.dispatcherId },
        { assignedDispatcherId: null, dispatcherAssignedAt: null },
      );
      // Try to immediately reassign each released call; if none available it
      // will be queued and the user notified.
      const call = await this.callsRepository.findOne({
        where: { id: callId },
      });
      if (call && call.status === CallStatus.PENDING) {
        await this.routeCall(call);
      }
    }
  }

  @OnEvent('dispatcher.refresh-requested')
  async onRefreshRequested(): Promise<void> {
    await this.driverGateway.refreshAvailableAmbulanceLocations();
  }

  @OnEvent('ambulance.locations.refreshed')
  async onLocationsRefreshed(): Promise<void> {
    const targets = this.dispatcherGateway.getOnlineDispatcherIds();
    if (targets.length === 0) return;
    const ambulances = await this.buildAmbulanceList();
    this.dispatcherGateway.broadcastAmbulanceListUpdated(targets, {
      ambulances,
    });
  }

  @OnEvent('ambulance.available')
  async onAmbulanceAvailable(): Promise<void> {
    const ambulances = await this.buildAmbulanceList();
    const dispatchersWithCalls = Array.from(this.dispatcherLoads.entries())
      .filter(([, calls]) => calls.size > 0)
      .map(([id]) => id);
    if (dispatchersWithCalls.length > 0) {
      this.dispatcherGateway.broadcastAmbulanceListUpdated(
        dispatchersWithCalls,
        { ambulances },
      );
    }
    // A freed ambulance doesn't help drain the dispatcher queue (queue depends
    // on dispatcher capacity, not ambulance availability) — but it does help
    // dispatchers who are already holding calls actually assign them.
  }

  // ───────────────────────── Internals ─────────────────────────

  private pickDispatcher(
    callId: string,
    callerUserId: string | null,
  ): string | null {
    const online = this.dispatcherGateway
      .getOnlineDispatcherIds()
      .filter((id) => id !== callerUserId);
    if (online.length === 0) return null;

    const seen = this.callSeenDispatchers.get(callId) ?? new Set<string>();
    const eligibleWithCapacity = online.filter(
      (id) => this.loadOf(id) < MAX_CALLS_PER_DISPATCHER,
    );

    if (eligibleWithCapacity.length === 0) return null;

    const unseen = eligibleWithCapacity.filter((id) => !seen.has(id));
    const pool = unseen.length > 0 ? unseen : eligibleWithCapacity;

    // Least-loaded; ties broken randomly.
    pool.sort((a, b) => this.loadOf(a) - this.loadOf(b));
    const minLoad = this.loadOf(pool[0]);
    const tied = pool.filter((id) => this.loadOf(id) === minLoad);
    return tied[Math.floor(Math.random() * tied.length)];
  }

  private async assignCallToDispatcher(
    callId: string,
    dispatcherId: string,
  ): Promise<boolean> {
    // Atomic claim: only succeed if the call is still pending & unassigned.
    const result = await this.callsRepository
      .createQueryBuilder()
      .update(Call)
      .set({ assignedDispatcherId: dispatcherId, dispatcherAssignedAt: new Date() })
      .where('id = :id', { id: callId })
      .andWhere('status = :status', { status: CallStatus.PENDING })
      .andWhere('"assignedDispatcherId" IS NULL')
      .execute();

    if (!result.affected || result.affected === 0) {
      this.logger.warn(
        `Failed to atomically assign call ${callId} to dispatcher ${dispatcherId} (already claimed?)`,
      );
      return false;
    }

    if (!this.dispatcherLoads.has(dispatcherId)) {
      this.dispatcherLoads.set(dispatcherId, new Set());
    }
    this.dispatcherLoads.get(dispatcherId)!.add(callId);
    this.scheduleTimer(callId);

    const [call, ambulances] = await Promise.all([
      this.callsRepository.findOne({
        where: { id: callId },
        relations: ['user', 'user.stateArchive', 'user.profile'],
      }),
      this.buildAmbulanceList(),
    ]);
    if (!call) return false;

    this.dispatcherGateway.notifyCallAssigned(dispatcherId, {
      call: await this.toCallOfferPayload(call),
      ambulances,
    });

    if (call.user?.id) {
      this.userGateway.notifyCallWithDispatcher(call.user.id, {
        callId: call.id,
      });
    }

    this.logger.log(
      `Assigned call ${callId} to dispatcher ${dispatcherId} (load now ${this.loadOf(
        dispatcherId,
      )})`,
    );
    return true;
  }

  private scheduleTimer(callId: string): void {
    this.cancelTimer(callId);
    const timer = setTimeout(() => {
      this.callTimers.delete(callId);
      this.handleTimeout(callId).catch((e) =>
        this.logger.error(`Timeout handler failed for call ${callId}`, e),
      );
    }, DISPATCHER_TIMEOUT_MS);
    this.callTimers.set(callId, timer);
  }

  private cancelTimer(callId: string): void {
    const t = this.callTimers.get(callId);
    if (t) {
      clearTimeout(t);
      this.callTimers.delete(callId);
    }
  }

  private async handleTimeout(callId: string): Promise<void> {
    // If a driver offer is already in flight for this call, don't reassign.
    const pendingAmbulance =
      this.driverGateway.getPendingAmbulanceId(callId);
    if (pendingAmbulance) {
      // Driver hasn't responded yet; just restart the timer.
      this.scheduleTimer(callId);
      return;
    }

    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['user'],
    });
    if (!call || call.status !== CallStatus.PENDING) {
      // Call is no longer relevant.
      this.callSeenDispatchers.delete(callId);
      return;
    }

    const currentDispatcherId = this.findHoldingDispatcher(callId);
    if (!currentDispatcherId) {
      // No one holds it — treat as a fresh route.
      await this.routeCall(call);
      return;
    }

    // Mark current dispatcher as seen for this call.
    const seen =
      this.callSeenDispatchers.get(callId) ?? new Set<string>();
    seen.add(currentDispatcherId);
    this.callSeenDispatchers.set(callId, seen);

    // Try to find a different eligible dispatcher (not in seen).
    const next = this.pickDispatcher(callId, call.user?.id ?? null);

    if (!next || next === currentDispatcherId) {
      // No alternative — fall back to keeping current dispatcher.
      this.logger.log(
        `Call ${callId} timeout: no alternative dispatcher, keeping with ${currentDispatcherId}`,
      );
      // Reset the seen-set so the current dispatcher can be picked again later.
      seen.delete(currentDispatcherId);
      this.callSeenDispatchers.set(callId, seen);
      this.scheduleTimer(callId);
      return;
    }

    // Release current, assign to next.
    this.removeCallFromDispatcher(currentDispatcherId, callId);
    this.dispatcherGateway.notifyCallReleased(currentDispatcherId, {
      callId,
      reason: 'timeout',
    });
    await this.callsRepository.update(
      { id: callId },
      { assignedDispatcherId: null, dispatcherAssignedAt: null },
    );
    await this.cancelOfferedDriverFcm(callId);
    this.driverGateway.clearOffer(callId);

    const assigned = await this.assignCallToDispatcher(callId, next);
    if (!assigned) {
      // Race: requeue.
      await this.notifyUserAwaitingDispatcher(callId);
    }

    // Drain queue for the freed dispatcher.
    void this.drainQueueForDispatcher(currentDispatcherId);
  }

  private async drainQueueForDispatcher(dispatcherId: string): Promise<void> {
    if (!this.dispatcherGateway.isDispatcherOnline(dispatcherId)) return;
    while (this.loadOf(dispatcherId) < MAX_CALLS_PER_DISPATCHER) {
      const next = await this.callsRepository
        .createQueryBuilder('call')
        .where('call.status = :status', { status: CallStatus.PENDING })
        .andWhere('call.assignedDispatcherId IS NULL')
        .andWhere('call.userId != :dispatcherId OR call.userId IS NULL', {
          dispatcherId,
        })
        .orderBy('call.createdAt', 'ASC')
        .getOne();
      if (!next) return;
      const claimed = await this.assignCallToDispatcher(next.id, dispatcherId);
      if (!claimed) {
        // Someone else got it; try the next one.
        continue;
      }
    }
  }

  private async reattachExistingCallsOnConnect(
    dispatcherId: string,
  ): Promise<void> {
    // Calls previously assigned to this dispatcher (across restarts) should be
    // re-attached so the timer / load tracking is consistent.
    const calls = await this.callsRepository.find({
      where: {
        assignedDispatcherId: dispatcherId,
        status: CallStatus.PENDING,
      },
      relations: ['user', 'user.stateArchive', 'user.profile'],
    });
    if (calls.length === 0) return;
    if (!this.dispatcherLoads.has(dispatcherId)) {
      this.dispatcherLoads.set(dispatcherId, new Set());
    }
    const load = this.dispatcherLoads.get(dispatcherId)!;
    const ambulances = await this.buildAmbulanceList();
    for (const call of calls) {
      load.add(call.id);
      this.scheduleTimer(call.id);
      this.dispatcherGateway.notifyCallAssigned(dispatcherId, {
        call: await this.toCallOfferPayload(call),
        ambulances,
      });
    }
    this.logger.log(
      `Re-attached ${calls.length} call(s) to dispatcher ${dispatcherId} on connect`,
    );
  }

  private async notifyUserAwaitingDispatcher(callId: string): Promise<void> {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['user'],
    });
    if (!call?.user?.id) return;
    const [position, queueSize] = await Promise.all([
      this.getQueuePosition(callId),
      this.getQueueSize(),
    ]);
    this.userGateway.notifyCallAwaitingDispatcher(call.user.id, {
      callId,
      position,
      queueSize,
    });
  }

  private async getQueuePosition(callId: string): Promise<number> {
    const calls = await this.callsRepository.find({
      where: { status: CallStatus.PENDING, assignedDispatcherId: IsNull() },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });
    const idx = calls.findIndex((c) => c.id === callId);
    return idx >= 0 ? idx + 1 : 0;
  }

  private async getQueueSize(): Promise<number> {
    return this.callsRepository.count({
      where: { status: CallStatus.PENDING, assignedDispatcherId: IsNull() },
    });
  }

  private async buildAmbulanceList(): Promise<DispatcherAmbulanceSummaryDto[]> {
    const ambulances = await this.ambulancesService.findAvailableList();
    return ambulances.map((amb) => ({
      id: amb.id,
      licensePlate: amb.licensePlate,
      vehicleModel: amb.vehicleModel ?? null,
      latitude: amb.latitude ?? null,
      longitude: amb.longitude ?? null,
      driverId: amb.driverId,
      driverOnline: amb.driverId
        ? this.driverGateway.isDriverOnline(amb.driverId)
        : false,
      available: amb.available,
    }));
  }

  private async toCallOfferPayload(call: Call): Promise<DispatcherCallOfferDto> {
    return {
      callId: call.id,
      description: call.description,
      latitude: call.latitude,
      longitude: call.longitude,
      createdAt: call.createdAt?.toISOString?.() ?? new Date().toISOString(),
      userName: call.user?.stateArchive?.fullName ?? null,
      patient: await this.resolvePatient(call),
    };
  }

  private async resolvePatient(
    call: Call,
  ): Promise<DispatcherCallOfferDto['patient']> {
    if (!call.patientEgn) {
      const archive = call.user?.stateArchive ?? null;
      if (!archive) return null;
      return this.buildPatientData(archive, call.user?.profile ?? null);
    }

    const archive = await this.stateArchiveRepo.findOne({
      where: { egn: call.patientEgn },
      relations: ['user', 'user.profile'],
    });
    if (!archive) return null;
    return this.buildPatientData(archive, archive.user?.profile ?? null);
  }

  private buildPatientData(
    archive: StateArchive,
    profile: Profile | null,
  ): DispatcherCallOfferDto['patient'] {
    return {
      egn: archive.egn,
      fullName: archive.fullName,
      phoneNumber: archive.phoneNumber,
      email: archive.email,
      bloodType: profile?.bloodType ?? null,
      allergies: profile?.allergies ?? null,
      medicines: profile?.medicines ?? null,
      illnesses: profile?.illnesses ?? null,
      height: profile?.height ?? null,
      weight: profile?.weight ?? null,
      gender: profile?.gender ?? null,
      dateOfBirth: profile?.dateOfBirth
        ? new Date(profile.dateOfBirth).toISOString()
        : null,
    };
  }

  private loadOf(dispatcherId: string): number {
    return this.dispatcherLoads.get(dispatcherId)?.size ?? 0;
  }

  private dispatcherHoldsCall(dispatcherId: string, callId: string): boolean {
    return this.dispatcherLoads.get(dispatcherId)?.has(callId) ?? false;
  }

  private findHoldingDispatcher(callId: string): string | null {
    for (const [dispatcherId, calls] of this.dispatcherLoads) {
      if (calls.has(callId)) return dispatcherId;
    }
    return null;
  }

  private removeCallFromDispatcher(dispatcherId: string, callId: string): void {
    this.dispatcherLoads.get(dispatcherId)?.delete(callId);
  }

  private async cancelOfferedDriverFcm(callId: string): Promise<void> {
    const pendingAmbulanceId =
      this.driverGateway.getPendingAmbulanceId(callId);
    if (!pendingAmbulanceId) return;
    try {
      const ambulance =
        await this.ambulancesService.findOne(pendingAmbulanceId);
      if (ambulance?.driverId) {
        await this.notificationService.sendCallCancelled(
          ambulance.driverId,
          callId,
        );
      }
    } catch (error) {
      this.logger.warn(
        `cancelOfferedDriverFcm: failed to notify driver for call ${callId}`,
        error,
      );
    }
  }
}
