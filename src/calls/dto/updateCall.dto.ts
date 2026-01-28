import { PartialType } from '@nestjs/mapped-types';
import { CreateCallDto } from './createCall.dto';

export class UpdateCallDto extends PartialType(CreateCallDto) {}
