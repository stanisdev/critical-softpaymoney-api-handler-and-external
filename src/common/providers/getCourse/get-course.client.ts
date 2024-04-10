import axios from 'axios';
import { GetCourseInitialPaymentResponse } from './get-course.interfaces';
import DatabaseLogger from '../logger/database.logger';
import { DatabaseLogType } from 'src/common/enums/general';

export class GetCourseClient {
    private static databaseLogger = DatabaseLogger.getInstance();

    /**
     * Get token
     */
    async getToken(
        url: string,
        API: string, // Secret key
        date: string,
    ): Promise<GetCourseInitialPaymentResponse> {
        try {
            const response = await axios.get(
                `https://${url}/pl/api/account/deals?key=${API}&status=new&created_at[from]=${date}`,
            );
            return {
                status:
                    response.data.success && response.data.info.export_id
                        ? true
                        : false,
                data:
                    response.data.success && response.data.info.export_id
                        ? response.data.info.export_id
                        : null,
            };
        } catch (error: any) {
            await GetCourseClient.databaseLogger.write(
                DatabaseLogType.GetCourseGetTokenError,
                {
                    payload: JSON.stringify(error),
                    url,
                    key: API,
                },
            );
            return {
                status: false,
                data: error?.response?.data ? error?.response?.data : null,
            };
        }
    }

    /**
     * Get old transaction number
     */
    async getOldTransactionNumber(
        url: string,
        API: string, // Secret key
        date: string,
        email: string,
        product: string,
    ): Promise<GetCourseInitialPaymentResponse> {
        try {
            const exportId = await this.getToken(url, API, date);

            if (!exportId.status) {
                return exportId;
            }
            let items = null;

            for (let index = 0; index < 12; index++) {
                const response = await axios.get(
                    `https://${url}/pl/api/account/exports/${exportId.data}?key=${API}`,
                );
                if (response.data.success && response.data.info.items) {
                    items = response.data.info.items;
                    break;
                }
            }
            if (!items) {
                return { status: false, data: null };
            }

            let dealNumber = null;

            for (let i = 0; i < items.length; i++) {
                if (items[i][4] == email && items[i][8] == product) {
                    dealNumber = items[i][1];
                    break;
                }
            }
            if (!dealNumber) {
                return { status: false, data: null };
            }

            return { status: true, data: dealNumber };
        } catch (error: any) {
            await GetCourseClient.databaseLogger.write(
                DatabaseLogType.GetCourseGetOldTransactionNumberError,
                {
                    payload: JSON.stringify(error),
                    url,
                    key: API,
                },
            );
            return {
                status: false,
                data: error?.response?.data ? error?.response?.data : null,
            };
        }
    }

    /**
     * Create new transaction
     */
    async createNewTransaction(
        url: string,
        API: string, // Secret key
        date: string,
        email: string,
        product: string,
        amount: number,
        payer: string,
        currency: string,
    ): Promise<GetCourseInitialPaymentResponse> {
        try {
            const dealNumber = await this.getOldTransactionNumber(
                url,
                API,
                date,
                email,
                product,
            );
            const params = {
                user: {
                    email,
                },
                system: {
                    refresh_if_exists: 1, // обновлять ли существующего пользователя 1/0 да/нет
                    multiple_offers: 1, // добавлять несколько предложений в заказ 1/0
                },
                deal: {
                    deal_number:
                        dealNumber.status && dealNumber.data
                            ? dealNumber.data
                            : '',
                    product_title: product, // "наименование предложения"
                    deal_cost: amount, // "сумма заказа"
                    deal_status: 'payed', // "код статуса заказа"
                    deal_is_paid: 1, // оплачен да/нет 1/0
                    deal_comment: `Оплата ПС - softpaymoney.com. Информация о платеже - https://softpaymoney.com/order/details/${payer}`, // "комментарий"
                    payment_type: 'OTHER', // "тип платежа из списка"
                    payment_status: 'accepted', // "статус платежа из списка"
                    deal_currency: currency, // "код валюты заказа" // например, "EUR", параметр не является обязательным, если он не используется в запросе - валютой заказа будут рубли (RUB)
                },
            };
            const data = new FormData();

            data.append('action', 'add');
            data.append('key', API);
            data.append(
                'params',
                Buffer.from(JSON.stringify(params), 'utf-8').toString('base64'),
            );
            const response = await axios.post(
                `https://${url}/pl/api/deals`,
                data,
                {
                    headers: {
                        Accept: 'application/json; q=1.0, */*; Q=0.1',
                    },
                },
            );
            return {
                status: response.data.result.success ? true : false,
                data: response.data.result.success
                    ? response.data.result
                    : null,
            };
        } catch (error: any) {
            await GetCourseClient.databaseLogger.write(
                DatabaseLogType.GetCourseCreateNewTransactionError,
                {
                    payload: JSON.stringify(error),
                    url,
                    key: API,
                    product,
                },
            );
            return {
                status: false,
                data: error?.response?.data ? error?.response?.data : null,
            };
        }
    }
}
