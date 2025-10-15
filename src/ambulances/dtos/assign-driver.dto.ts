import { IsString, IsOptional } from 'class-validator';

export class AssignDriverDto {
  @IsOptional()
  @IsString()
  driverId?: string;
}
