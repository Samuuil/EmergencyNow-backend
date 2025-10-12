import { PartialType } from '@nestjs/mapped-types';
import { CreateStateArchiveDto } from './create-state-archive.dto';

export class UpdateStateArchiveDto extends PartialType(CreateStateArchiveDto) {}
