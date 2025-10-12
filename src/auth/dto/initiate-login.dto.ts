import { IsString, Length, IsEnum } from 'class-validator';

export enum LoginMethod {
  EMAIL = 'email',
  SMS = 'sms',
}

export class InitiateLoginDto {
  @Length(10, 10, { message: 'EGN must be exactly 10 characters long' })
  @IsString()
  egn: string;

  @IsEnum(LoginMethod, { message: 'Login method must be either email or sms' })
  method: LoginMethod;
}
