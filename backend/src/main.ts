import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true, // Allow all origins for now, or you can put your frontend URL here
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Increase body limit for base64 evidence images
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

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
