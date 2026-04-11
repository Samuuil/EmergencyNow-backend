import { IsLatitude, IsLongitude, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectHospitalBodyDto {
  @ApiProperty()
  @IsUUID()
  hospitalId: string;

  @ApiProperty()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  longitude: number;
}
