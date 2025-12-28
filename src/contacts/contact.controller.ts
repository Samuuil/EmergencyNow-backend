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
  import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
  import { Paginate } from 'nestjs-paginate';
  import type { PaginateQuery } from 'nestjs-paginate';
  import { BasePaginationDto } from '../common/dtos';
  import { ContactsService } from './contact.service';
  import { CreateContactDto } from './dto/createContact.dto';
  import { UpdateContactDto } from './dto/updateContact.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '../common/enums/role.enum';
  import { CurrentUser } from '../auth/decorators/current-user.decorator';
  
  @ApiTags('Contacts')
  @ApiBearerAuth('AccessToken')
  @Controller('contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}

    @Get('me')
    @ApiOperation({ summary: 'Get my contacts' })
    @ApiQuery({ type: BasePaginationDto })
    async getMyContacts(@CurrentUser() user: any, @Paginate() query: PaginateQuery) {
      return this.contactsService.getUserContacts(user.id, query);
    }

    @Post('me')
    @ApiOperation({ summary: 'Create a new contact for current user' })
    async createMyContact(@CurrentUser() user: any, @Body() dto: CreateContactDto) {
      return this.contactsService.createContactForUser(user.id, dto);
    }

    @Get('me/:id')
    @ApiOperation({ summary: 'Get my contact by ID' })
    async getMyContact(@CurrentUser() user: any, @Param('id') id: string) {
      return this.contactsService.getUserContact(user.id, id);
    }

    @Patch('me/:id')
    @ApiOperation({ summary: 'Update my contact' })
    async updateMyContact(
      @CurrentUser() user: any,
      @Param('id') id: string,
      @Body() dto: UpdateContactDto,
    ) {
      return this.contactsService.updateUserContact(user.id, id, dto);
    }

    @Delete('me/:id')
    @ApiOperation({ summary: 'Delete my contact' })
    async removeMyContact(@CurrentUser() user: any, @Param('id') id: string) {
      await this.contactsService.removeUserContact(user.id, id);
      return { message: 'Contact deleted successfully' };
    }

    // Admin routes: require ADMIN role
    @Post()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create a new contact (Admin only)' })
    async create(@Body() dto: CreateContactDto) {
      return this.contactsService.create(dto);
    }

    @Get()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Get all contacts (Admin only)' })
    @ApiQuery({ type: BasePaginationDto })
    async findAll(@Paginate() query: PaginateQuery) {
      return this.contactsService.findAll(query);
    }

    @Get(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Get contact by ID (Admin only)' })
    async findOne(@Param('id') id: string) {
      return this.contactsService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Update contact (Admin only)' })
    async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
      return this.contactsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete contact (Admin only)' })
    async remove(@Param('id') id: string) {
      await this.contactsService.remove(id);
      return { message: `Contact ${id} deleted successfully.` };
    }
  }
