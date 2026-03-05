import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStateArchiveDto {
  @ApiProperty({
    description: 'Bulgarian EGN (10 digits)',
    example: '1234567890',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'EGN must be exactly 10 characters long' })
  egn: string;

  @ApiProperty({ description: 'Full name', example: 'Ivan Petrov' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    description: 'Email address',
    example: 'ivan.petrov@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Bulgarian phone number',
    example: '+359888123456',
  })
  @IsPhoneNumber('BG', {
    message: 'Phone number must be a valid Bulgarian number',
  })
  phoneNumber: string;
}
