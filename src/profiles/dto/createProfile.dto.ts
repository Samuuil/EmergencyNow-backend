import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';

export class CreateProfileDto {
  @IsNumber()
  height: number;

  @IsNumber()
  weight: number;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString({ each: true })
  allergies?: string[];
}
