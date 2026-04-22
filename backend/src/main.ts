import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  if (process.env.NODE_ENV !== 'production') {
    await app.listen(process.env.PORT ?? 3001);
  }

  await app.init();
  return app;
}

// For Vercel serverless deployment
let app: any;
export default async (req: any, res: any) => {
  if (!app) {
    app = await bootstrap();
  }
  const instance = app.getHttpAdapter().getInstance();
  instance(req, res);
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}
