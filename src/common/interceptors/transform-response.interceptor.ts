import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'src/common/interfaces/general';

@Injectable()
export class TransformResponseInterceptor<T>
    implements NestInterceptor<T, Response<T>>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        const response = context.switchToHttp().getResponse();

        return next.handle().pipe(
            map((data) => {
                return {
                    data,
                    statusCode: response.statusCode,
                };
            }),
        );
    }
}
