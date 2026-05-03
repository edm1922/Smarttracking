import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrafficInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const start = Date.now();

    return next.handle().pipe(
      tap(async () => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - start;

        // Skip certain paths to avoid log bloat (e.g., health checks, static assets)
        if (url.includes('/health') || url.includes('/metrics')) return;

        try {
          await this.prisma.trafficLog.create({
            data: {
              method,
              path: url,
              userId: user?.sub || null,
              ip: ip || null,
              userAgent,
              statusCode,
              duration,
            },
          });
        } catch (error) {
          console.error('[TrafficInterceptor] Failed to log traffic:', error.message);
        }
      }),
    );
  }
}
