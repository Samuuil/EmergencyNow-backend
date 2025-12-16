import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation } from '@nestjs/swagger';
  import { UsersService } from './user.service';
  import { CreateUserDto } from './dto/createUser.dto';
  import { UpdateUserDto } from './dto/updateUser.dto';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '../common/enums/role.enum';
  import { User } from './entities/user.entity';
  
  @ApiTags('Users')
  @Controller('users')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}
  
    @Post()
    // @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Create a new user' })
    async create(@Body() dto: CreateUserDto): Promise<User> {
      return await this.usersService.create(dto);
    }
  
    @Get()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    async findAll(): Promise<User[]> {
      return await this.usersService.findAll();
    }
  
    @Get(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Get user by ID (Admin only)' })
    async findOne(@Param('id') id: string): Promise<User> {
      return await this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Update user (Admin only)' })
    async update(
      @Param('id') id: string,
      @Body() dto: UpdateUserDto,
    ): Promise<User> {
      return await this.usersService.update(id, dto);
    }
  
    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Delete user (Admin only)' })
    async remove(@Param('id') id: string): Promise<{ message: string }> {
      await this.usersService.remove(id);
      return { message: 'User deleted successfully' };
    }

    @Get('user-role/:id')
    @ApiOperation({ summary: 'Get user role by user ID' })
    async findRole(@Param('id') id: string): Promise<String> {
      return await this.usersService.findUserRole(id);
    }

  }