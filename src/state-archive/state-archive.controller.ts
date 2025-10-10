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
  import { StateArchiveService } from './state-archive.service';
  import { CreateStateArchiveDto } from './dto/create-state-archive.dto';
  import { UpdateStateArchiveDto } from './dto/update-state-archive.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '../common/enums/role.enum';
  import { StateArchive } from './entities/state-archive.entity';
  
  @Controller('state-archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  export class StateArchiveController {
    constructor(private readonly stateArchiveService: StateArchiveService) {}
  
    @Post()
    async create(@Body() dto: CreateStateArchiveDto): Promise<StateArchive> {
      return await this.stateArchiveService.create(dto);
    }
  
    @Get()
    async findAll(): Promise<StateArchive[]> {
      return await this.stateArchiveService.findAll();
    }
  
    @Get(':id')
    async findOne(@Param('id') id: string): Promise<StateArchive> {
      return await this.stateArchiveService.findOne(id);
    }
  
    @Patch(':id')
    async update(
      @Param('id') id: string,
      @Body() dto: UpdateStateArchiveDto,
    ): Promise<StateArchive> {
      return await this.stateArchiveService.update(id, dto);
    }
  
    @Delete(':id')
    async remove(@Param('id') id: string): Promise<{ message: string }> {
      await this.stateArchiveService.remove(id);
      return { message: 'Archive deleted successfully' };
    }
  }
  