import { ObjectId } from 'mongodb';
import { MongoClient } from 'src/common/providers/mongo-client';
import {
    ExternalInteractionPayload,
    MongoDocument,
} from 'src/common/types/general';

export class ExternalInteractionDataSource {
    private mongoClient = MongoClient.getInstance().database;
    public order: MongoDocument;
    public product: MongoDocument;
    public merchantWebhook: MongoDocument;

    constructor(private payload: ExternalInteractionPayload) {}

    /**
     * Load data from external sources
     */
    async load(): Promise<void> {
        const orderId = <string>this.payload.orderId;
        const productOwnerId = <string>this.payload.productOwnerId;

        this.order = await this.mongoClient.collection('orders').findOne({
            _id: new ObjectId(orderId),
        });
        this.product = await this.mongoClient.collection('products').findOne({
            _id: this.order.product,
        });
        this.merchantWebhook = await this.mongoClient
            .collection('webhooks')
            .findOne({
                user: new ObjectId(productOwnerId),
            });
    }
}
