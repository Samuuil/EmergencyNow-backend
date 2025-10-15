import { IsString, IsOptional, Matches, IsNumber, IsUUID } from 'class-validator';

export class CreateAmbulanceDto {
  @IsString()
  @Matches(/^[A-Z]{2}\d{4}[A-Z]{2}$/, {
    message: 'License plate must be in Bulgarian format: 2 letters, 4 numbers, 2 letters (e.g., CA1234AB)',
  })
  licensePlate: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsUUID()
  driverId?: string;
}
