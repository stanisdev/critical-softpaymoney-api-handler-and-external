import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
    PipeTransform,
} from '@nestjs/common';
import { PaymentSystem } from '../enums/general';

@Injectable()
export class PaymentSystemValidationPipe implements PipeTransform {
    private paymentSystems: string[] = Object.values(PaymentSystem);

    async transform(value: string, metadata: ArgumentMetadata) {
        if (
            metadata.type === 'param' &&
            metadata.data === 'paymentSystem' &&
            !this.paymentSystems.includes(value)
        ) {
            throw new BadRequestException(
                `Incorrect 'payment system' parameter`,
            );
        }
        return value;
    }
}
