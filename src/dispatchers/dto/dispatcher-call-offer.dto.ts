import { ApiProperty } from '@nestjs/swagger';
import { BloodType } from '../../common/enums/blood-type.enum';
import { Gender } from '../../common/enums/gender.enum';

export class PatientRecordDto {
  @ApiProperty()
  egn: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: BloodType, required: false, nullable: true })
  bloodType: BloodType | null;

  @ApiProperty({ type: [String], required: false, nullable: true })
  allergies: string[] | null;

  @ApiProperty({ type: [String], required: false, nullable: true })
  medicines: string[] | null;

  @ApiProperty({ type: [String], required: false, nullable: true })
  illnesses: string[] | null;

  @ApiProperty({ required: false, nullable: true })
  height: number | null;

  @ApiProperty({ required: false, nullable: true })
  weight: number | null;

  @ApiProperty({ enum: Gender, required: false, nullable: true })
  gender: Gender | null;

  @ApiProperty({ required: false, nullable: true })
  dateOfBirth: string | null;
}

export class DispatcherCallOfferDto {
  @ApiProperty({ format: 'uuid' })
  callId: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ required: false, nullable: true })
  userName: string | null;

  @ApiProperty({ type: PatientRecordDto, required: false, nullable: true })
  patient: PatientRecordDto | null;
}
