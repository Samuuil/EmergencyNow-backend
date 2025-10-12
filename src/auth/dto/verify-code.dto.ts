import { IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @Length(10, 10, { message: 'EGN must be exactly 10 characters long' })
  @IsString()
  egn: string;

  @Length(6, 6, { message: 'Verification code must be exactly 6 characters long' })
  @IsString()
  code: string;
}
