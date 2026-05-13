import { IsNumber, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'Phone number of the patient if calling on behalf of someone else',
    example: '+359888123456',
  })
  @IsOptional()
  @IsString()
  patientPhoneNumber?: string;
}
