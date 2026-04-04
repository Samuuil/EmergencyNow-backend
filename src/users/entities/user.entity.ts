import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Profile } from '../../profiles/entities/profile.entity';
import { Call } from '../../calls/entities/call.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { Role } from '../../common/enums/role.enum';
import { StateArchive } from '../../state-archive/entities/state-archive.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Exclude()
  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Exclude()
  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  @JoinColumn()
  profile: Profile;

  @Exclude()
  @OneToMany(() => Call, (call) => call.user)
  calls: Call[];

  @Exclude()
  @OneToMany(() => Contact, (contact) => contact.user, { cascade: true })
  contacts: Contact[];

  @Exclude()
  @OneToOne(() => StateArchive, (archive) => archive.user, { cascade: true })
  @JoinColumn()
  stateArchive: StateArchive;
}
