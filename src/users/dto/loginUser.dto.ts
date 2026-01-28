import { IsString, Matches } from 'class-validator';

export class LoginUserDto {
  @Matches(/^[0-9]{10}$/, { message: 'EGN must be 10 digits' })
  egn: string;

  @IsString()
  password: string;
}
