import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Gender } from '../../common/enums/gender.enum';
import { BloodType } from '../../common/enums/blood-type.enum';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  height: number;

  @Column()
  weight: number;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column('text', { array: true, nullable: true })
  allergies: string[];

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: BloodType, nullable: true })
  bloodType: BloodType;

  @Column('text', { array: true, nullable: true })
  medicines: string[];

  @Column('text', { array: true, nullable: true })
  illnesses: string[];

  @OneToOne(() => User, (user) => user.profile)
  user: User;
}
