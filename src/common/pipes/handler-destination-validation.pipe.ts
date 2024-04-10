import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
    PipeTransform,
} from '@nestjs/common';
import { HandlerDestination } from '../enums/general';

@Injectable()
export class HandlerDestinationValidationPipe implements PipeTransform {
    private handlerDestinations: string[] = Object.values(HandlerDestination);

    async transform(value: string, metadata: ArgumentMetadata) {
        if (
            metadata.type === 'param' &&
            metadata.data === 'handlerDestination' &&
            !this.handlerDestinations.includes(value)
        ) {
            throw new BadRequestException(
                `Incorrect destination to be processed`,
            );
        }
        return value;
    }
}
