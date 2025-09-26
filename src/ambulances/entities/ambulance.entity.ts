import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ambulances')
export class Ambulance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehicleIdentifier: string; 

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @Column({ default: true })
  available: boolean;
}
