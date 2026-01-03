import {
    Controller,
    Get,
    Param,
    UseGuards,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
  import { Paginate } from 'nestjs-paginate';
  import type { PaginateQuery } from 'nestjs-paginate';
  import { BasePaginationDto } from '../common/dtos';
  import { StateArchiveService } from './state-archive.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '../common/enums/role.enum';
  import { StateArchive } from './entities/state-archive.entity';
 
  
@ApiTags('State Archive')
@Controller('state-archive')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class StateArchiveController {
  constructor(private readonly stateArchiveService: StateArchiveService) {}

  @Get()
  @ApiOperation({ summary: 'Get all state archive entries (local database only)' })
  @ApiQuery({ type: BasePaginationDto })
  async findAll(@Paginate() query: PaginateQuery) {
    return await this.stateArchiveService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get state archive entry by ID (local database only)' })
  async findOne(@Param('id') id: string): Promise<StateArchive> {
    return await this.stateArchiveService.findOne(id);
  }
}
