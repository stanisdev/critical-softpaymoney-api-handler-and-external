import config from '../common/config';
import { DataSource } from 'typeorm';
import { BalanceEntity } from './entities/balance.entity';
import { PaymentTransactionEntity } from './entities/paymentTransaction.entity';
import { IncomingRequestEntity } from './entities/incomingRequest.entity';
import { LogEntity } from './entities/log.entity';
import { OrderEntity } from './entities/order.entity';
import { BalanceUpdateQueueEntity } from './entities/balanceUpdateQueue.entity';
import { HandlerPortEntity } from './entities/handlerPort.entity';

export const typeOrmDataSource = new DataSource({
    type: 'postgres',
    host: config.db.postgres.host,
    port: config.db.postgres.port,
    username: config.db.postgres.user,
    password: config.db.postgres.password,
    database: config.db.postgres.name,
    logging: true,
    synchronize: false,
    name: 'default',
    entities: [
        BalanceEntity,
        BalanceUpdateQueueEntity,
        PaymentTransactionEntity,
        IncomingRequestEntity,
        LogEntity,
        OrderEntity,
        HandlerPortEntity,
    ],
    migrations: [],
});
