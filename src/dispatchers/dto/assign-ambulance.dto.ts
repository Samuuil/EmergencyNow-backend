import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAmbulanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  ambulanceId: string;
}
