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
  import { CurrentUser } from '../auth/decorators/current-user.decorator';
  
  @Controller('contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}

    // User routes: authenticated users can manage their own contacts
    @Get('me')
    async getMyContacts(@CurrentUser() user: any) {
      return this.contactsService.getUserContacts(user.id);
    }

    @Post('me')
    async createMyContact(@CurrentUser() user: any, @Body() dto: CreateContactDto) {
      return this.contactsService.createContactForUser(user.id, dto);
    }

    @Get('me/:id')
    async getMyContact(@CurrentUser() user: any, @Param('id') id: string) {
      return this.contactsService.getUserContact(user.id, id);
    }

    @Patch('me/:id')
    async updateMyContact(
      @CurrentUser() user: any,
      @Param('id') id: string,
      @Body() dto: UpdateContactDto,
    ) {
      return this.contactsService.updateUserContact(user.id, id, dto);
    }

    @Delete('me/:id')
    async removeMyContact(@CurrentUser() user: any, @Param('id') id: string) {
      await this.contactsService.removeUserContact(user.id, id);
      return { message: 'Contact deleted successfully' };
    }

    // Admin routes: require ADMIN role
    @Post()
    @Roles(Role.ADMIN)
    async create(@Body() dto: CreateContactDto) {
      return this.contactsService.create(dto);
    }

    @Get()
    @Roles(Role.ADMIN)
    async findAll() {
      return this.contactsService.findAll();
    }

    @Get(':id')
    @Roles(Role.ADMIN)
    async findOne(@Param('id') id: string) {
      return this.contactsService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
      return this.contactsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    async remove(@Param('id') id: string) {
      await this.contactsService.remove(id);
      return { message: `Contact ${id} deleted successfully.` };
    }
  }
