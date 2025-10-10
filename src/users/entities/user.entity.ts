import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Profile } from '../../profiles/entities/profile.entity';
import { Call } from '../../calls/entities/call.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { Role } from '../../common/enums/role.enum';
import { StateArchive } from '../../state-archive/entities/state-archive.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @Column()
  // fullName: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ type: 'varchar', nullable: true })
  refreshToken?: string;

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  @JoinColumn()
  profile: Profile;

  @OneToMany(() => Call, (call) => call.user)
  calls: Call[];

  @OneToMany(() => Contact, (contact) => contact.user, { cascade: true })
  contacts: Contact[];

  @OneToOne(() => StateArchive, (archive) => archive.user, { cascade: true })
  @JoinColumn()
  stateArchive: StateArchive;
}
