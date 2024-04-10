import { Document, ObjectId, WithId } from 'mongodb';
import { ContentType } from '../enums/general';

export type Dictionary = {
    [key: string]: string | number | Date | boolean | ObjectId | Dictionary;
};

export type HandlerSuccessfulResponse = {
    ok: boolean;
    data: ExecutionFinalResult;
};

export type ExternalSuccessfulResponse = {
    ok: boolean;
};

export type AxiosResponse<T> = {
    status: number;
    data: T;
};

export type HttpRequestResult = {
    ok: boolean;
    statusCode?: number;
    message?: string;
    data?: Dictionary;
};

export type MongoDocument = WithId<Document>;

export type MerchantApiParameters = {
    order: MongoDocument;
    productOwner: MongoDocument;
    finalAmount: number;
    untouchedAmount: number;
};

export type ExternalInteractionPayload = {
    orderId: string;
    productOwnerId: string;
    finalAmount: number;
    untouchedAmount: number;
};

export type ExecutionFinalResult = {
    payload: any;
    contentType: ContentType;
};
