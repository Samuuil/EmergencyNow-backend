import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Patch,
    UseGuards,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation } from '@nestjs/swagger';
  import { StateArchiveService } from './state-archive.service';
  import { CreateStateArchiveDto } from './dto/create-state-archive.dto';
  import { UpdateStateArchiveDto } from './dto/update-state-archive.dto';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '../common/enums/role.enum';
  import { StateArchive } from './entities/state-archive.entity';
  
  @ApiTags('State Archive')
  @Controller('state-archive')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  export class StateArchiveController {
    constructor(private readonly stateArchiveService: StateArchiveService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create state archive entry' })
    async create(@Body() dto: CreateStateArchiveDto): Promise<StateArchive> {
      return await this.stateArchiveService.create(dto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all state archive entries' })
    async findAll(): Promise<StateArchive[]> {
      return await this.stateArchiveService.findAll();
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get state archive entry by ID' })
    async findOne(@Param('id') id: string): Promise<StateArchive> {
      return await this.stateArchiveService.findOne(id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update state archive entry' })
    async update(
      @Param('id') id: string,
      @Body() dto: UpdateStateArchiveDto,
    ): Promise<StateArchive> {
      return await this.stateArchiveService.update(id, dto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete state archive entry' })
    async remove(@Param('id') id: string): Promise<{ message: string }> {
      await this.stateArchiveService.remove(id);
      return { message: 'Archive deleted successfully' };
    }
  }