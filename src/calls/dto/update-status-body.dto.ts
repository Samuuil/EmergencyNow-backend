import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CallStatus } from '../../common/enums/call-status.enum';

export class UpdateStatusBodyDto {
  @ApiProperty({ enum: CallStatus })
  @IsEnum(CallStatus)
  status: CallStatus;
}
