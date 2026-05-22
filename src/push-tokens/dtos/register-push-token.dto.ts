import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty({
    description: 'FCM registration token issued by the device',
    example: 'fcm_token_abc123',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
