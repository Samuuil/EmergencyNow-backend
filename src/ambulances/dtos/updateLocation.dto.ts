import { IsNumber, IsString } from 'class-validator';

export class UpdateLocationDto {
  @IsString()
  vehicleIdentifier: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
