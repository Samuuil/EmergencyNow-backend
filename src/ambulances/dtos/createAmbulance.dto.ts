import { IsString, IsOptional } from 'class-validator';

export class CreateAmbulanceDto {
  @IsString()
  vehicleIdentifier: string;
  
  @IsOptional()
  @IsString()
  driverId?: string;
}
