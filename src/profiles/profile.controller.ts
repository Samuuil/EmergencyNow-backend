import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { BasePaginationDto } from '../common/dtos';
import { ProfilesService } from './profile.service';
import { CreateProfileDto } from './dto/createProfile.dto';
import { UpdateProfileDto } from './dto/updateProfile.dto';
import { Profile } from './entities/profile.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('AccessToken')
  @ApiOperation({ summary: 'Create a new profile' })
  create(@Body() dto: CreateProfileDto): Promise<Profile> {
    return this.profilesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiBearerAuth('AccessToken')
  @ApiOperation({ summary: 'Get all profiles' })
  @ApiQuery({ type: BasePaginationDto })
  findAll(@Paginate() query: PaginateQuery) {
    return this.profilesService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiBearerAuth('AccessToken')
  getMyProfile(@CurrentUser() user: AuthenticatedUser): Promise<Profile> {
    return this.profilesService.getProfileForUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  @ApiOperation({ summary: 'Create my profile' })
  @ApiBearerAuth('AccessToken')
  createMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProfileDto,
  ): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  @ApiOperation({ summary: 'Update my profile (full replace)' })
  @ApiBearerAuth('AccessToken')
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update my profile (partial)' })
  @ApiBearerAuth('AccessToken')
  patchMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiBearerAuth('AccessToken')
  @ApiOperation({ summary: 'Get profile by ID' })
  findOne(@Param('id') id: string): Promise<Profile> {
    return this.profilesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-egn/:egn')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.DRIVER)
  @ApiBearerAuth('AccessToken')
  @ApiOperation({ summary: 'Get profile by EGN (for doctors)' })
  getProfileByEgn(@Param('egn') egn: string): Promise<Profile> {
    return this.profilesService.getProfileByEgn(egn);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('AccessToken')
  @ApiOperation({ summary: 'Update profile' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<Profile> {
    return this.profilesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('AccessToken')
  @ApiOperation({ summary: 'Delete profile' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.profilesService
      .remove(id)
      .then(() => ({ message: 'Profile deleted successfully' }));
  }
}
