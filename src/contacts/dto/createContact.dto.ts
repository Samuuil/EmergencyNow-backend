import { IsString, IsEmail, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactErrorMessages, ContactErrorCode } from '../errors/contact-errors.enum';

export class CreateContactDto {
  @ApiProperty({ description: 'Contact name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Contact phone number (Bulgarian format)',
    example: '+359881234567',
  })
  @Matches(/^(\+359|0)[0-9]{8,9}$/, {
    message: ContactErrorMessages[ContactErrorCode.INVALID_PHONE_NUMBER],
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
