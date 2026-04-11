import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { InitiateLoginDto } from './dto/initiate-login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('initiate-login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Initiate login by sending verification code' })
  async initiateLogin(
    @Body() dto: InitiateLoginDto,
  ): Promise<{ message: string }> {
    return this.authService.initiateLogin(dto);
  }

  @Post('verify-code')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verify code and get access tokens' })
  async verifyCode(
    @Body() dto: VerifyCodeDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.verifyCode(dto);
  }
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBearerAuth('RefreshToken')
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @ApiBearerAuth('AccessToken')
  async logout(
    @Request() req: { user?: { sub?: string } },
  ): Promise<{ message: string }> {
    return this.authService.logout(req.user?.sub as string);
  }
}
