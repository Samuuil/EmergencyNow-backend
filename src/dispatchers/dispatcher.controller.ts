import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { DispatcherService } from './dispatcher.service';
import { AssignAmbulanceDto } from './dto/assign-ambulance.dto';

@ApiTags('Dispatchers')
@ApiBearerAuth('AccessToken')
@Controller('dispatchers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DISPATCHER, Role.ADMIN)
export class DispatcherController {
  constructor(private readonly dispatcherService: DispatcherService) {}

  @Get('me/calls')
  @ApiOperation({ summary: 'Get calls currently assigned to the dispatcher' })
  async myCalls(@CurrentUser() user: User) {
    return this.dispatcherService.getCallsForDispatcher(user.id);
  }

  @Get('me/ambulances')
  @ApiOperation({ summary: 'Get available ambulances with their locations' })
  async availableAmbulances() {
    return this.dispatcherService.getAmbulanceListForDispatchers();
  }

  @Post('me/calls/:callId/assign-ambulance')
  @ApiOperation({ summary: 'Offer an ambulance to its driver for this call' })
  async assignAmbulance(
    @CurrentUser() user: User,
    @Param('callId') callId: string,
    @Body() dto: AssignAmbulanceDto,
  ): Promise<{ message: string }> {
    await this.dispatcherService.handleAssignAmbulanceRequest(
      user.id,
      callId,
      dto.ambulanceId,
    );
    return { message: 'Ambulance offered to driver' };
  }
}
