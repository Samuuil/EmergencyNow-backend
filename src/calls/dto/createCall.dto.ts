import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCallDto {
  @ApiPropertyOptional({
    description: 'Emergency description',
    example: 'Patient has chest pain and difficulty breathing',
  })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Emergency location latitude', example: 42.6977 })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Emergency location longitude',
    example: 23.3219,
  })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'User EGN', example: '1234567890' })
  @IsNotEmpty()
  @IsString()
  userEgn: string;
}
