import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../common/enums/gender.enum';
import { BloodType } from '../../common/enums/blood-type.enum';

export class CreateProfileDto {
  @ApiProperty({ description: 'Height in centimeters', example: 175 })
  @IsNumber()
  height: number;

  @ApiProperty({ description: 'Weight in kilograms', example: 70 })
  @IsNumber()
  weight: number;

  @ApiProperty({ description: 'Gender', enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({
    description: 'List of allergies',
    example: ['Penicillin', 'Peanuts'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ description: 'Date of birth', example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @ApiPropertyOptional({
    description: 'Blood type',
    enum: BloodType,
    example: BloodType.A_POSITIVE,
  })
  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @ApiPropertyOptional({
    description: 'List of medicines the user is taking',
    example: ['Aspirin', 'Insulin'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  medicines?: string[];

  @ApiPropertyOptional({
    description: 'List of illnesses',
    example: ['Diabetes', 'Hypertension'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  illnesses?: string[];
}
