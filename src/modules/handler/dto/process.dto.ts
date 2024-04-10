import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class ProcessDto {
    @IsNumber()
    @Min(1)
    @Max(2147483647)
    @IsNotEmpty()
    readonly incomingRequestId: number;
}
