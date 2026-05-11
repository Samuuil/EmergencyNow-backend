import { ApiProperty } from '@nestjs/swagger';

export class DispatcherAmbulanceSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  licensePlate: string;

  @ApiProperty({ required: false, nullable: true })
  vehicleModel: string | null;

  @ApiProperty({ required: false, nullable: true })
  latitude: number | null;

  @ApiProperty({ required: false, nullable: true })
  longitude: number | null;

  @ApiProperty({ required: false, nullable: true, format: 'uuid' })
  driverId: string | null;

  @ApiProperty()
  driverOnline: boolean;

  @ApiProperty()
  available: boolean;
}
