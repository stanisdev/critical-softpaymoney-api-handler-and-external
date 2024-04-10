import { IsEnum, IsJSON } from 'class-validator';
import { PaymentSystem } from 'src/common/enums/general';

export class EntryPointDto {
    @IsEnum(PaymentSystem)
    readonly paymentSystem: PaymentSystem;

    @IsJSON()
    payload: string;
}
