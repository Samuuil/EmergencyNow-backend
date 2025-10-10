import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './createContact.dto';

export class UpdateContactDto extends PartialType(CreateContactDto) {}
