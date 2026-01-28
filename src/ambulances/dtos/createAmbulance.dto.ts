import { IsString, IsOptional, Matches, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAmbulanceDto {
  @ApiProperty({ description: 'Bulgarian license plate format', example: 'CA1234AB', pattern: '^[A-Z]{2}\\d{4}[A-Z]{2}$' })
  @IsString()
  @Matches(/^[A-Z]{2}\d{4}[A-Z]{2}$/, {
    message: 'License plate must be in Bulgarian format: 2 letters, 4 numbers, 2 letters (e.g., CA1234AB)',
  })
  licensePlate: string;

  @ApiPropertyOptional({ description: 'Vehicle model', example: 'Mercedes-Benz Sprinter' })
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional({ description: 'Initial latitude', example: 42.6977 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Initial longitude', example: 23.3219 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Driver UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
