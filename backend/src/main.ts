import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://smarttracking-frontend.vercel.app',
      'https://smarttracking-three.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });
  
  // Increase body limit for base64 evidence images
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Listen on port if NOT running as a Vercel serverless function
  if (!process.env.VERCEL) {
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`Backend is running on port ${port}`);
  } else {
    await app.init();
  }
  
  return app;
}

// For Vercel serverless deployment
let cachedApp: any;
export default async (req: any, res: any) => {
  if (!cachedApp) {
    cachedApp = await bootstrap();
  }
  const instance = cachedApp.getHttpAdapter().getInstance();
  instance(req, res);
};

// Start the app if running directly (e.g. on your Ryzen PC)
if (!process.env.VERCEL) {
  bootstrap();
}
