import axios, { Axios } from 'axios';
import {
    InitialPaymentReport,
    InitialPaymentResponse,
    InitialPaymentResponseToken,
} from './atol.interfaces';
import config from 'src/common/config';
import DatabaseLogger from '../logger/database.logger';
import { PaymentInfo, AtolRequestMethod } from './atol.enums';
import { AtolOperation } from './atol.types';
import { DatabaseLogType } from 'src/common/enums/general';

export class AtolClient {
    private login = config.atol.login;
    private password = config.atol.password;
    private groupCode: string;
    private companyEmail: string;
    private inn = config.atol.inn;
    private paymentUrl = config.atol.paymentUrl;
    private axios: Axios;
    private static databaseLogger = DatabaseLogger.getInstance();

    /**
     * Build the client instance
     */
    constructor() {
        this.groupCode = config.atol.groupCode;
        this.companyEmail = config.atol.companyEmail;
        this.axios = axios.create({
            baseURL: config.atol.url,
        });
    }

    /**
     * Get auth token
     */
    async getToken(): Promise<InitialPaymentResponseToken> {
        try {
            const credentials = {
                login: this.login,
                pass: this.password,
            };
            const requestResult = await this.axios.post(
                `/${AtolRequestMethod.GetToken}`,
                credentials,
                {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                    },
                },
            );
            /**
             * Example:
                {
                    status: true,
                    data: {
                        token: 'ieh3KpTZmrBta7nhoVPducJa_Px_Ay_LbKUql31NQYpa0h9O147LuYePyw2JpRb5g7LSHHGFKerjT1ZyrwK-sTRtCNk7xxpiZsrdR8l_cFXt7t5usEbgfSxayUSpFS81',
                        error: null,
                        timestamp: '03.04.2024 15:20:56'
                    },
                    success: true,
                    message: 'OK'
                }
             */
            return {
                status: true,
                data: requestResult.data,
                success: requestResult.data.token ? true : false,
                message: requestResult.data.token
                    ? 'OK'
                    : requestResult.data.error.text
                      ? requestResult.data.error.text
                      : 'error getToken',
            };
        } catch (error: any) {
            /**
             * Log the error to database
             */
            await AtolClient.databaseLogger.write(
                DatabaseLogType.CannotGetAtolAuthToken,
                {
                    error: JSON.stringify(error),
                },
            );
            return {
                status: false,
                data: error?.response?.data ? error?.response?.data : null,
                success: false,
                message: error?.response?.data.error.text
                    ? error?.response?.data.error.text
                    : 'error getToken',
            };
        }
    }

    /**
     * Create check
     */
    async CreateOperation(
        operation: AtolOperation,
        paymentId: string,
        name: string,
        amount: number,
        userContacts: { Email: string; Phone: string },
    ): Promise<InitialPaymentResponse> {
        try {
            const token = await this.getToken();

            /**
             * Auth token was gotten successfully
             */
            if (
                token.status === true &&
                typeof token.data?.token === 'string' &&
                token.data?.timestamp
            ) {
                const clientInfo = {
                    email: userContacts.Email ? userContacts.Email : 'none',
                    phone: userContacts.Phone ? userContacts.Phone : 'none',
                };
                const companyInfo = {
                    email: this.companyEmail,
                    sno: PaymentInfo.Sno,
                    inn: this.inn,
                    payment_address: this.paymentUrl,
                };
                const requestPayload = {
                    timestamp: token.data.timestamp,
                    external_id: paymentId,
                    receipt: {
                        client: clientInfo,
                        company: companyInfo,
                        items: [
                            {
                                name,
                                price: amount,
                                quantity: PaymentInfo.Quantity,
                                measure: PaymentInfo.Measure,
                                sum: amount,
                                payment_method: PaymentInfo.PaymentMethod,
                                payment_object: PaymentInfo.PaymentObject,
                                vat: {
                                    type: PaymentInfo.VatType,
                                },
                                user_data: paymentId,
                            },
                        ],
                        payments: [
                            {
                                type: PaymentInfo.PaymentsType,
                                sum: amount,
                            },
                        ],
                        total: amount,
                    },
                };
                const response = await this.axios.post(
                    `/${this.groupCode}/${operation}`,
                    requestPayload,
                    {
                        headers: {
                            'Content-Type': 'application/json; charset=utf-8',
                            Token: token.data.token,
                        },
                    },
                );
                /**
                 * Example:
                    {
                        status: true,
                        data: {
                            uuid: 'b0ca83c1-8814-4c06-8741-89836a734aa7',
                            status: 'wait',
                            error: null,
                            timestamp: '03.04.2024 16:20:42'
                        },
                        success: true,
                        message: 'OK'
                    }
                 */
                return {
                    status: true,
                    data: response.data,
                    success:
                        response.data.uuid && response.data.status === 'wait'
                            ? true
                            : false,
                    message:
                        response.data.uuid && response.data.status === 'wait'
                            ? 'OK'
                            : response.data.error.text
                              ? response.data.error.text
                              : 'error CreateOperation',
                };
            } else {
                /**
                 * @todo: log the error to database
                 */
                return {
                    status: false,
                    data: token.data,
                    success: token.success,
                    message: token.message,
                };
            }
        } catch (error: any) {
            /**
             * Log error to database
             */
            await AtolClient.databaseLogger.write(
                DatabaseLogType.CannotCreateAtolCheck,
                {
                    error: JSON.stringify(error),
                },
            );
            return {
                status: false,
                data: error?.response?.data ? error?.response?.data : null,
                success: false,
                message: error?.response?.data.error.text
                    ? error?.response?.data.error.text
                    : 'error CreateOperation',
            };
        }
    }

    /**
     * Get information about the check and a link to the check
     */
    async getReport(uuid: string): Promise<InitialPaymentReport> {
        try {
            const token = await this.getToken();

            if (token.status && token.data?.token && token.data?.timestamp) {
                const response = await this.axios.get(
                    `/${this.groupCode}/${AtolRequestMethod.Report}/${uuid}`,
                    {
                        headers: {
                            Token: token.data.token,
                        },
                    },
                );
                /**
                 * Example:
                    {
                        status: true,
                        data: {
                            callback_url: '',
                            daemon_code: 'quasar',
                            device_code: 'KKT008439',
                            warnings: null,
                            error: null,
                            external_id: 'G-S-NBCF9Q1N6R09JH2K',
                            group_code: 'group_code_44425',
                            payload: {
                            ecr_registration_number: '0007492718034364',
                            fiscal_document_attribute: 4145935932,
                            fiscal_document_number: 57832,
                            fiscal_receipt_number: 51,
                            fn_number: '7280440500244928',
                            fns_site: 'nalog.gov.ru',
                            receipt_datetime: '03.04.2024 16:46:00',
                            shift_number: 120,
                            total: 101,
                            ofd_inn: '7704211201',
                            ofd_receipt_url: 'https://receipt.taxcom.ru/v01/show?fp=4145935932&s=101&sf=False&sfn=False'
                            },
                            status: 'done',
                            uuid: 'b430ed6b-d394-4582-830b-fb80640ca79f',
                            timestamp: '03.04.2024 16:46:01'
                        },
                        success: true,
                        message: 'OK'
                    }
                 */
                return {
                    status: true,
                    data: response.data,
                    success:
                        response.data.uuid && response.data.status === 'done'
                            ? true
                            : false,
                    message:
                        response.data.uuid && response.data.status === 'done'
                            ? 'OK'
                            : response.data.error.text
                              ? response.data.error.text
                              : 'error getReport',
                };
            } else {
                return {
                    status: false,
                    data: token.data,
                    success: token.success,
                    message: token.message,
                };
            }
        } catch (error: any) {
            /**
             * Log error to database
             */
            await AtolClient.databaseLogger.write(
                DatabaseLogType.CannotGetReportAboutCheck,
                {
                    error: JSON.stringify(error),
                },
            );
            return {
                status: false,
                data: error?.response?.data ? error?.response?.data : null,
                success: false,
                message: error?.response?.data.error.text
                    ? error?.response?.data.error.text
                    : 'error getReport',
            };
        }
    }
}
