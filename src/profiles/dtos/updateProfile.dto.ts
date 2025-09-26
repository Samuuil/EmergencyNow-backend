import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';

export class UpdateProfileDto {
  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString({ each: true })
  allergies?: string[];
}
