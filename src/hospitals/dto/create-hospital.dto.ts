import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHospitalDto {
  @ApiProperty({ description: 'Hospital name', example: 'Sofia City Hospital' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Hospital address',
    example: 'ul. "Zdrave" 2, Sofia',
  })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Hospital latitude', example: 42.6977 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Hospital longitude', example: 23.3219 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: 'Hospital phone number',
    example: '+35928012345',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Google Place ID', example: 'ChIJ...' })
  @IsOptional()
  @IsString()
  placeId?: string;

  @ApiPropertyOptional({
    description: 'Is hospital active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
