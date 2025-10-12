import { IsString, IsEmail, IsOptional, IsPhoneNumber } from 'class-validator';

export class CreateContactDto {
  @IsString()
  name: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
