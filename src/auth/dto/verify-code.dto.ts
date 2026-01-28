import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({ description: 'Bulgarian EGN (10 digits)', example: '1234567890', minLength: 10, maxLength: 10 })
  @Length(10, 10, { message: 'EGN must be exactly 10 characters long' })
  @IsString()
  egn: string;

  @ApiProperty({ description: 'Verification code sent via SMS/Email', example: '123456', minLength: 6, maxLength: 6 })
  @Length(6, 6, { message: 'Verification code must be exactly 6 characters long' })
  @IsString()
  code: string;
}
