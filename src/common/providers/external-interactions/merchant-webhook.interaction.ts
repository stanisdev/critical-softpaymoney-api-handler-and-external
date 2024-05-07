import { ObjectId } from 'mongodb';
import {
    Dictionary,
    ExternalInteractionPayload,
} from 'src/common/types/general';
import HTTPMethod from 'http-method-enum';
import config from 'src/common/config';
import { HttpStatus } from '@nestjs/common';
import { MongoClient } from 'src/common/providers/mongo-client';
import { GeneralUtil } from 'src/common/utils/general.util';
import { HttpClient } from '../http-client';
import { ExternalInteractionDataSource } from 'src/modules/external-interaction/external-interaction.data-source';

export class MerchantWebhookInteraction {
    private mongoClient = MongoClient.getInstance().database;
    private webhookIsAvailable = true;
    private webhookRequestPayload: Dictionary;

    constructor(
        private payload: ExternalInteractionPayload,
        private dataSource: ExternalInteractionDataSource,
    ) {}

    /**
     * Start the process
     */
    async execute(): Promise<void> {
        this.validateDataSource();

        if (!this.webhookIsAvailable) {
            return;
        }
        this.buildWebhookPayload();
        await this.sendPayloadToWebhook();
    }

    /**
     * Send payload to the Merchant webhook API
     */
    async sendPayloadToWebhook(): Promise<void> {
        const { merchantWebhook, order } = this.dataSource;
        const { webhookRequestPayload } = this;

        const httpClient = new HttpClient({
            url: merchantWebhook.link,
            body: webhookRequestPayload,
            method: HTTPMethod.POST,
            timeout: config.timeout.merchantWebhook,
        });
        const requestResult = await httpClient.sendRequest();

        /**
         * Create record in 'webhook_journals' collection
         */
        const webhookJournalRecord = {
            url: merchantWebhook.link,
            order: order._id,
            webhook: merchantWebhook._id,
            requestBody: webhookRequestPayload,
            responseBody: JSON.stringify(
                requestResult.message || { non: 'data' },
            ),
            statusCode: requestResult.statusCode,
            amount: webhookRequestPayload.amount,
            paidAmount: webhookRequestPayload.paidAmount,
            createdAt: new Date(),
        };
        const insertResult = await this.mongoClient
            .collection('webhook_journals')
            .insertOne(webhookJournalRecord);

        const webhookJournalMetadata = {
            id: String(insertResult.insertedId),
            order: String(order._id),
        };
        /**
         * If request failed
         */
        if (
            requestResult.ok !== true ||
            requestResult.statusCode !== HttpStatus.OK
        ) {
            await this.scheduleWebhookExecution(webhookJournalMetadata);
        }
    }

    /**
     * Schedule not handled merchant webhook
     */
    private async scheduleWebhookExecution({
        order,
    }: Dictionary): Promise<void> {
        const [lastWebhookJournalInstance] = await this.mongoClient
            .collection('webhook_journals')
            .find({
                order: new ObjectId(<string>order),
            })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();

        /**
         * 24 hours agowebhookJournalRecord
         */
        const limitDate = new Date(
            new Date().setDate(new Date().getDate() - 1),
        );
        if (
            !(lastWebhookJournalInstance instanceof Object) ||
            new Date(lastWebhookJournalInstance.createdAt).getTime() <
                limitDate.getTime()
        ) {
            // @todo: remove all 'webhook journal' records from Mongo
            return;
        }
        /**
         * 1 hour (in milliseconds)
         */
        const oneHour = 1000 * 60 * 60;

        setTimeout(() => {
            new MerchantWebhookInteraction(
                this.payload,
                this.dataSource,
            ).execute();
        }, oneHour);
    }

    /**
     * Build payload for request to a merchant webhook
     */
    private buildWebhookPayload(): void {
        const { product, order, merchantWebhook } = this.dataSource;
        const { payload } = this;

        const promoCode = product.promocodes?.find(
            (element: Dictionary) => element.id === order.promocode?.id,
        );
        this.webhookRequestPayload = {
            paidAt: new Date(order.paidAt as Date).toISOString(),
            promocodeName: promoCode?.name || '',
            promocodeType: promoCode?.type || '',
            recurrent: !!order.recurrent?.status,
            productLink: product?.link,
            paidAmount: payload.finalAmount,
            payerPhone: order.phone,
            payerEmail: order.email,
            payer: order.payer,
            type: order.payment?.type,
            amount: payload.untouchedAmount,
            status: order.status,
            token: '',
        };
        const signatureHashPayload = Object.entries({
            ...this.webhookRequestPayload,
            secret: merchantWebhook.secret,
        })
            .sort()
            .reduce(
                (accumulationString: string, key) =>
                    accumulationString + String(key.pop()),
                '',
            );

        this.webhookRequestPayload.token =
            GeneralUtil.generateSha256Hash(signatureHashPayload);
        this.webhookRequestPayload.data = order.customData;

        this.webhookRequestPayload.questions = order.questions.map(
            (question: Dictionary) => {
                const result = {
                    question: question?.name,
                    answer: question?.answer,
                };
                return result;
            },
        );
        this.webhookRequestPayload.paymentId = order.payment.id;
    }

    /**
     * Validate data source
     */
    private validateDataSource(): void {
        const { merchantWebhook } = this.dataSource;
        if (
            !(merchantWebhook instanceof Object) ||
            typeof merchantWebhook.secret !== 'string' ||
            !merchantWebhook.verified
        ) {
            this.webhookIsAvailable = false;
            return;
        }
    }
}
