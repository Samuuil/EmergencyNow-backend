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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { BasePaginationDto } from '../common/dtos';
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() dto: CreateUserDto): Promise<User> {
    return await this.usersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ type: BasePaginationDto })
  async findAll(@Paginate() query: PaginateQuery) {
    return await this.usersService.findAll(query);
  }

  @Get('user-role/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user role by user ID' })
  async findRole(@Param('id') id: string): Promise<string> {
    return await this.usersService.findUserRole(id);
  }

  @Get('me/egn')
  @ApiOperation({ summary: 'Get my EGN' })
  async findMyEgn(@CurrentUser() user: User): Promise<{ egn: string }> {
    return await this.usersService.findUserEgn(user.id);
  }

  @Get(':id/egn')
  @Roles(Role.ADMIN, Role.DRIVER, Role.DOCTOR)
  @ApiOperation({ summary: 'Get user EGN by user ID' })
  async findEgn(@Param('id') id: string): Promise<{ egn: string }> {
    return await this.usersService.findUserEgn(id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DRIVER, Role.DOCTOR)
  @ApiOperation({ summary: 'Get user by ID' })
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
}
