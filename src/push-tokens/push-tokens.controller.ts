import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/auth.types';
import { PushTokensService } from './push-tokens.service';
import { RegisterPushTokenDto } from './dtos/register-push-token.dto';
import { DeletePushTokenDto } from './dtos/delete-push-token.dto';

@ApiTags('Push Tokens')
@Controller('push-tokens')
export class PushTokensController {
  constructor(private readonly pushTokensService: PushTokensService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('AccessToken')
  @ApiOperation({ summary: 'Register an FCM token for the current user' })
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<{ success: true }> {
    await this.pushTokensService.upsert(user.id, dto.token);
    return { success: true };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('AccessToken')
  @ApiOperation({ summary: 'Remove an FCM token for the current user' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeletePushTokenDto,
  ): Promise<void> {
    await this.pushTokensService.remove(user.id, dto.token);
  }
}
