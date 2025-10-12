import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, Length } from 'class-validator';

export class CreateStateArchiveDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'EGN must be exactly 10 characters long' })
  egn: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsPhoneNumber('BG', { message: 'Phone number must be a valid Bulgarian number' })
  phoneNumber: string;
}
