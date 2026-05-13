import { ApiProperty } from '@nestjs/swagger';

export class NotificationDataDto {
  @ApiProperty({ description: 'Call ID', required: false })
  callId?: string;

  @ApiProperty({ description: 'Call description', required: false })
  description?: string;

  @ApiProperty({ description: 'Caller latitude', required: false })
  latitude?: number;

  @ApiProperty({ description: 'Caller longitude', required: false })
  longitude?: number;

  @ApiProperty({
    description: 'Distance from the driver to the caller (meters)',
    required: false,
  })
  distance?: number;

  @ApiProperty({
    description: 'Estimated travel time to the caller (seconds)',
    required: false,
  })
  duration?: number;

  @ApiProperty({ description: 'Priority hint for the client', required: false })
  priority?: string;

  [key: string]: any;
}
