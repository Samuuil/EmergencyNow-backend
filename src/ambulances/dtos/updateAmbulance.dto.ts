import { PartialType } from '@nestjs/mapped-types';
import { CreateAmbulanceDto } from './createAmbulance.dto';

export class UpdateAmbulanceDto extends PartialType(CreateAmbulanceDto) {}
