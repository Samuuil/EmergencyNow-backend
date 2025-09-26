import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Gender } from '../../common/enums/gender.enum';

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

  @OneToOne(() => User, (user) => user.profile)
  user: User;
}
