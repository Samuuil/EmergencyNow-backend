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
  import { UsersService } from './user.service';
  import { CreateUserDto } from './dto/createUser.dto';
  import { UpdateUserDto } from './dto/updateUser.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { Role } from '../common/enums/role.enum';
  import { User } from './entities/user.entity';
  
  @Controller('users')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}
  
    @Post()
    // @Roles(Role.ADMIN)
    async create(@Body() dto: CreateUserDto): Promise<User> {
      return await this.usersService.create(dto);
    }
  
    @Get()
    @Roles(Role.ADMIN)
    async findAll(): Promise<User[]> {
      return await this.usersService.findAll();
    }
  
    @Get(':id')
    @Roles(Role.ADMIN)
    async findOne(@Param('id') id: string): Promise<User> {
      return await this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    async update(
      @Param('id') id: string,
      @Body() dto: UpdateUserDto,
    ): Promise<User> {
      return await this.usersService.update(id, dto);
    }
  
    @Delete(':id')
    @Roles(Role.ADMIN)
    async remove(@Param('id') id: string): Promise<{ message: string }> {
      await this.usersService.remove(id);
      return { message: 'User deleted successfully' };
    }

    @Get('user-role/:id')
    async findRole(@Param('id') id: string): Promise<String> {
      return await this.usersService.findUserRole(id);
    }

  }
  