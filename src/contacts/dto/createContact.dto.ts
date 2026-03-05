import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: 'Contact name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+359888123456',
  })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
