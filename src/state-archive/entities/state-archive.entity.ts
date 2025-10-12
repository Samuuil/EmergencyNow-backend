import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('state_archive')
export class StateArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  egn: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phoneNumber: string;

  @OneToOne(() => User, (user) => user.stateArchive)
  user: User;
}
