import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeletePushTokenDto {
  @ApiProperty({
    description: 'FCM registration token to remove',
    example: 'fcm_token_abc123',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
