import { StatusReceipt } from './atol.enums';

export interface InitialPaymentResponseToken {
    status: boolean;
    data: {
        error: {
            error_id?: string;
            code?: number;
            text?: string;
            type?: string;
        } | null;
        token?: string;
        timestamp: string;
    } | null;
    success: boolean;
    message: string;
}

export interface InitialPaymentResponse {
    status: boolean;
    data: {
        error: {
            error_id?: string;
            code?: number;
            text?: string;
            type?: string;
        } | null;
        uuid?: string;
        status?: StatusReceipt;
        timestamp: string;
    } | null;
    success: boolean;
    message: string;
}

export interface InitialPaymentReport {
    status: boolean;
    data: {
        error: {
            error_id?: string;
            code?: number;
            text?: string;
            type?: string;
        } | null;
        payload?: {
            ecr_registration_number?: string;
            fiscal_document_attribute?: number;
            fiscal_document_number?: number;
            fiscal_receipt_number?: number;
            fn_number?: string;
            fns_site?: string;
            receipt_datetime?: string;
            shift_number?: number;
            total?: number;
            ofd_inn?: string;
            ofd_receipt_url?: string;
        } | null;
        callback_url?: string;
        daemon_code?: string;
        device_code?: string;
        warnings?: string | null;
        external_id?: string;
        group_code?: string;
        status?: StatusReceipt;
        uuid?: string;
        timestamp: string;
    } | null;
    success: boolean;
    message: string;
}
