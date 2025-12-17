import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class BasePaginationDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Sort results',
  })
  @IsOptional()
  sortBy?: [string, string][];

  @ApiProperty({
    required: false,
    type: String,
    description: 'Search term',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
