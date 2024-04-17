import { MongoClient } from '../../mongoClient';
import { ObjectId } from 'mongodb';

export class GazpromRepository {
    private mongoClient = MongoClient.getInstance().database;

    /**
     * Update 'order.payment.trx_id' by 'id'
     */
    async updateOrderPaymentTrxIdById(
        orderId: ObjectId,
        trxId: string,
    ): Promise<void> {
        await this.mongoClient.collection('orders').updateOne(
            {
                _id: orderId,
            },
            {
                $set: {
                    'payment.trx_id': trxId,
                },
            },
        );
    }
}
