import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { ProfilesService } from './profile.service';
import { CreateProfileDto } from './dto/createProfile.dto';
import { UpdateProfileDto } from './dto/updateProfile.dto';
import { Profile } from './entities/profile.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  create(@Body() dto: CreateProfileDto): Promise<Profile> {
    return this.profilesService.create(dto);
  }

  @Get()
  findAll(): Promise<Profile[]> {
    return this.profilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Profile> {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profilesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.profilesService.remove(id).then(() => ({ message: 'Profile deleted successfully' }));
  }

  // Authenticated user endpoints
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@CurrentUser() user: any): Promise<Profile> {
    return this.profilesService.getProfileForUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  createMyProfile(@CurrentUser() user: any, @Body() dto: CreateProfileDto): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  updateMyProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  patchMyProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profilesService.createOrUpdateForUser(user.id, dto);
  }
}
