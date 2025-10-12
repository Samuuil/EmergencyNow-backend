import { IsString } from 'class-validator';

export class CreateContactDto {
  @IsString()
  phoneNumber: string;
}
