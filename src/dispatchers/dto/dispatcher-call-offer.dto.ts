import { ApiProperty } from '@nestjs/swagger';

export class DispatcherCallOfferDto {
  @ApiProperty({ format: 'uuid' })
  callId: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ required: false, nullable: true })
  userName: string | null;
}
