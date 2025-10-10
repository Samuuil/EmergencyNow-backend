import { IsString, Length } from 'class-validator';

export class LoginDto {
  @Length(10, 10, { message: 'EGN must be exactly 10 characters long' })
  @IsString()
  egn: string;
}
