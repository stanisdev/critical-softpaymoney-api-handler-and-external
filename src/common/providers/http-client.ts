import axios from 'axios';
import HttpMethod from 'http-method-enum';
import { isEmpty } from 'lodash';
import { AxiosResponse, Dictionary, HttpRequestResult } from '../types/general';

export class HttpClient {
    constructor(
        private params: {
            url: string;
            method: HttpMethod;
            body: Dictionary;
            timeout: number;
        },
    ) {}
    /**
     * Send http request
     */
    async sendRequest(): Promise<HttpRequestResult> {
        const { params } = this;
        let response: AxiosResponse<Dictionary>;
        try {
            response = await axios({
                method: params.method,
                url: params.url,
                data: params.body,
                timeout: params.timeout,
            });
        } catch (requestFailed) {
            let errorMessage: string;
            /**
             * Determine the error message
             */
            if (requestFailed instanceof Object) {
                if (requestFailed.cause instanceof Object) {
                    try {
                        errorMessage = JSON.stringify(requestFailed.cause);
                    } catch {
                        errorMessage = `Unable to serialize 'requestFailed.cause' object`;
                    }
                } else if (typeof requestFailed.message === 'string') {
                    errorMessage = requestFailed.message;
                }
            }
            if (isEmpty(errorMessage)) {
                errorMessage = 'Cannot spot the cause of failed http request';
            }

            const statusCode = requestFailed.response?.status;

            return {
                ok: false,
                message: errorMessage,
                statusCode,
            };
        }
        const requestResult = {
            ok: true,
            data: {},
            statusCode: response?.status,
        };
        if (response?.data instanceof Object) {
            requestResult.data = response.data;
        }
        return requestResult;
    }
}
