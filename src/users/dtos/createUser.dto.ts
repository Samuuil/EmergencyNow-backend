import { IsEmail, IsString, Matches, Length } from 'class-validator';

export class CreateUserDto {
  @Matches(/^[0-9]{10}$/, { message: 'EGN must be 10 digits' })
  egn: string;

  @IsString()
  fullName: string;

  @IsString()
  phoneNumber: string;

  @IsEmail()
  email: string;

  @Length(6, 20)
  password: string;
}
