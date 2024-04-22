import { ExecutionFinalResult } from '../types/general';

export interface Response<T> {
    data?: T;
    statusCode: number;
    message?: string | string[];
}

export interface WebhookFrame {
    execute(): Promise<void>;
    getFinalResult(): ExecutionFinalResult;
}

export interface IndependentScript {
    execute(): Promise<void>;
}
