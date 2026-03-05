import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';
import { CreateStateArchiveDto } from '../../state-archive/dto/create-state-archive.dto';

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'User role',
    enum: Role,
    example: Role.USER,
    default: Role.USER,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.USER;

  @ApiProperty({
    description: 'State archive data',
    type: CreateStateArchiveDto,
  })
  @ValidateNested()
  @Type(() => CreateStateArchiveDto)
  stateArchive: CreateStateArchiveDto;
}
