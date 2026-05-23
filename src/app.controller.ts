import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @ApiExcludeEndpoint()
  @Get()
  @Redirect('/api/docs', 302)
  redirectToDocs() {}

  @Get('health/v2')
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth(): string {
    return 'App is healthy';
  }
}
