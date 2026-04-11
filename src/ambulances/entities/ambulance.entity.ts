import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('ambulances')
export class Ambulance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  licensePlate: string;

  @Column({ nullable: true })
  vehicleModel: string;

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @Column({ default: true })
  available: boolean;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driverId' })
  driver: User | null;

  @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastCallAcceptedAt: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
