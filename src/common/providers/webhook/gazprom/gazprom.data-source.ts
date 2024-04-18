import DatabaseLogger from '../../logger/database.logger';
import { MongoClient } from '../../mongoClient';
import { ObjectId } from 'mongodb';
import { DatabaseLogType } from 'src/common/enums/general';
import { InternalServerErrorException } from '@nestjs/common';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { MongoDocument } from 'src/common/types/general';
import { Сurrency } from 'src/common/enums/general';

export class GazpromDataSource {
    private static databaseLogger = DatabaseLogger.getInstance();
    private mongoClient = MongoClient.getInstance().database;

    constructor(private readonly incomingRequest: IncomingRequestEntity) {}

    /**
     * Find order in MongoDB
     */
    async findOrderByPaymentId(orderPaymentId: string): Promise<MongoDocument> {
        const order = await this.mongoClient.collection('orders').findOne({
            'payment.id': orderPaymentId,
        });
        if (!(order instanceof Object)) {
            await GazpromDataSource.databaseLogger.write(
                DatabaseLogType.OrderInMongoNotFound,
                {
                    incomingRequestId: this.incomingRequest.id,
                    'order.payment.id': orderPaymentId,
                },
            );
            throw new InternalServerErrorException(
                `Order not found (payment.id = "${orderPaymentId}")`,
            );
        }
        return order;
    }

    /**
     * Find product in MongoDB
     */
    async findProductById(id: ObjectId): Promise<MongoDocument> {
        const product = await this.mongoClient.collection('products').findOne({
            _id: id,
        });
        if (!(product instanceof Object)) {
            await GazpromDataSource.databaseLogger.write(
                DatabaseLogType.ProductInMongoNotFound,
                {
                    incomingRequestId: this.incomingRequest.id,
                    'product.id': String(id),
                },
            );
            throw new InternalServerErrorException(
                `Product not found (id = "${id}")`,
            );
        }
        return product;
    }

    /**
     * Find user owning the product
     */
    async findProductOwnerById(id: ObjectId): Promise<MongoDocument> {
        const productOwner = await this.mongoClient
            .collection('users')
            .findOne({
                _id: id,
            });
        if (!(productOwner instanceof Object)) {
            await GazpromDataSource.databaseLogger.write(
                DatabaseLogType.ProductOwnerInMongoNotFound,
                {
                    incomingRequestId: this.incomingRequest.id,
                    'productOwner.id': String(id),
                },
            );
            throw new InternalServerErrorException(
                `Product owner not found (id = "${id}")`,
            );
        }
        return productOwner;
    }

    /**
     * Get user balance
     */
    async findUserBalance(userId: ObjectId, currency: Сurrency): Promise<MongoDocument> {
        const productOwnerBalance = await this.mongoClient
            .collection('payments')
            .findOne({
                user: userId,
                type: currency,
            });
        if (!(productOwnerBalance instanceof Object)) {
            await GazpromDataSource.databaseLogger.write(
                DatabaseLogType.ProductOwnerBalanceInMongoNotFound,
                {
                    incomingRequestId: this.incomingRequest.id,
                    userId,
                    currencyType: currency,
                },
            );
            throw new InternalServerErrorException(
                `Product owner balance not found (user.id = "${userId}")`,
            );
        }
        return productOwnerBalance;
    }
}
