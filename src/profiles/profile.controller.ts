import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profile.service';
import { CreateProfileDto } from './dto/createProfile.dto';
import { UpdateProfileDto } from './dto/updateProfile.dto';
import { Profile } from './entities/profile.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new profile' })
  create(@Body() dto: CreateProfileDto): Promise<Profile> {
    return this.profilesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all profiles' })
  findAll(): Promise<Profile[]> {
    return this.profilesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get profile by ID' })
  findOne(@Param('id') id: string): Promise<Profile> {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update profile' })
  update(@Param('id') id: string, @Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profilesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete profile' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.profilesService.remove(id).then(() => ({ message: 'Profile deleted successfully' }));
  }

  // Authenticated user endpoints
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiBearerAuth('AccessToken')
  getMyProfile(@CurrentUser() user: any): Promise<Profile> {
    return this.profilesService.getProfileForUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  @ApiOperation({ summary: 'Create my profile' })
  @ApiBearerAuth('AccessToken')
  createMyProfile(@CurrentUser() user: any, @Body() dto: CreateProfileDto): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  @ApiOperation({ summary: 'Update my profile (full replace)' })
  @ApiBearerAuth('AccessToken')
  updateMyProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update my profile (partial)' })
  @ApiBearerAuth('AccessToken')
  patchMyProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }
}
