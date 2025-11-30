import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCallDto {
  @IsOptional()
  @IsString()
  description: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  patientEgn?: string;
}
