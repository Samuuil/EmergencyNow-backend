import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV');
  const baseUrl = configService.get<string>('BASE_URL');

  if (nodeEnv === 'DEV' || nodeEnv === 'development' || !nodeEnv) {
    const builder = new DocumentBuilder()
      .setTitle('EmergencyNow API')
      .setDescription('Emergency ambulance dispatch system API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http' }, 'AccessToken')
      .addBearerAuth({ type: 'http' }, 'RefreshToken');

    if (baseUrl) {
      builder.addServer(baseUrl);
    }

    const openApiConfig = builder.build();

    const document = SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
