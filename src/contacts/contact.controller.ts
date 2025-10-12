import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    UseGuards,
  } from '@nestjs/common';
  import { ContactsService } from './contact.service';
  import { CreateContactDto } from './dto/createContact.dto';
  import { UpdateContactDto } from './dto/updateContact.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '../common/enums/role.enum';
  
  @Controller('contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}
  
    @Post()
    async create(@Body() dto: CreateContactDto) {
      return this.contactsService.create(dto);
    }
  
    @Get()
    async findAll() {
      return this.contactsService.findAll();
    }
  
    @Get(':id')
    async findOne(@Param('id') id: string) {
      return this.contactsService.findOne(id);
    }
  
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
      return this.contactsService.update(id, dto);
    }
  
    @Delete(':id')
    async remove(@Param('id') id: string) {
      await this.contactsService.remove(id);
      return { message: `Contact ${id} deleted successfully.` };
    }
  }
  