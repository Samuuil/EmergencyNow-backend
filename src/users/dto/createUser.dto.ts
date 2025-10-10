import { IsEmail, IsEnum, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';
import { CreateStateArchiveDto } from '../../state-archive/dto/create-state-archive.dto';

export class CreateUserDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.USER;

  @ValidateNested()
  @Type(() => CreateStateArchiveDto)
  stateArchive: CreateStateArchiveDto;
}
