import { IsString, Length, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum LoginMethod {
  EMAIL = 'email',
  SMS = 'sms',
}

export class InitiateLoginDto {
  @ApiProperty({ description: 'Bulgarian EGN (10 digits)', example: '1234567890', minLength: 10, maxLength: 10 })
  @Length(10, 10, { message: 'EGN must be exactly 10 characters long' })
  @IsString()
  egn: string;

  @ApiProperty({ description: 'Login method', enum: LoginMethod, example: LoginMethod.SMS })
  @IsEnum(LoginMethod, { message: 'Login method must be either email or sms' })
  method: LoginMethod;
}
