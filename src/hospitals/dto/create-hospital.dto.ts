import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateHospitalDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
