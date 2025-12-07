import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ambulance } from '../../ambulances/entities/ambulance.entity';
import { CallStatus } from '../../common/enums/call-status.enum';

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @ManyToOne(() => User, (user) => user.calls)
  @JoinColumn()
  user: User;

  @ManyToOne(() => Ambulance, { nullable: true })
  @JoinColumn()
  ambulance: Ambulance;

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.PENDING,
  })
  status: CallStatus;

  @Column('text', { nullable: true })
  routePolyline: string;

  @Column({ type: 'int', nullable: true })
  estimatedDistance: number;

  @Column({ type: 'int', nullable: true })
  estimatedDuration: number;

  @Column({ type: 'json', nullable: true })
  routeSteps: Array<{
    distance: number;
    duration: number;
    instruction: string;
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
  }>;

  @Column('float', { nullable: true })
  ambulanceCurrentLatitude: number;

  @Column('float', { nullable: true })
  ambulanceCurrentLongitude: number;

  @Column({ type: 'timestamp', nullable: true })
  dispatchedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  arrivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Hospital selection (after driver arrives at patient location)
  @Column({ nullable: true })
  selectedHospitalId: string;

  @Column({ nullable: true })
  selectedHospitalName: string;

  @Column('text', { nullable: true })
  hospitalRoutePolyline: string;

  @Column({ type: 'int', nullable: true })
  hospitalRouteDistance: number;

  @Column({ type: 'int', nullable: true })
  hospitalRouteDuration: number;

  @Column({ type: 'json', nullable: true })
  hospitalRouteSteps: Array<{
    distance: number;
    duration: number;
    instruction: string;
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
  }>;
}
