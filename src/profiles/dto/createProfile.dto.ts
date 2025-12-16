import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../common/enums/gender.enum';

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

  @ApiPropertyOptional({ description: 'List of allergies', example: ['Penicillin', 'Peanuts'], type: [String] })
  @IsOptional()
  @IsString({ each: true })
  allergies?: string[];
}
