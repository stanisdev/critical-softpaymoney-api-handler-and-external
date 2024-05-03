import { typeOrmDataSource } from '../data-source';
import { BalanceEntity } from '../entities/balance.entity';
import { BalanceUpdateQueueEntity } from '../entities/balanceUpdateQueue.entity';
import { EncryptedStorageEntity } from '../entities/encryptedStorage.entity';
import { HandlerPortEntity } from '../entities/handlerPort.entity';
import { IncomingRequestEntity } from '../entities/incomingRequest.entity';
import { LogEntity } from '../entities/log.entity';
import { OrderEntity } from '../entities/order.entity';
import { PaymentTransactionEntity } from '../entities/paymentTransaction.entity';
import { RecurrentPaymentsQueueEntity } from '../entities/recurrentPaymentsQueue.entity';

export const balanceRepository = typeOrmDataSource.getRepository(BalanceEntity);
export const paymentTransactionRepository = typeOrmDataSource.getRepository(
    PaymentTransactionEntity,
);
export const incomingRequestRepository = typeOrmDataSource.getRepository(
    IncomingRequestEntity,
);
export const balanceUpdateQueueRepository = typeOrmDataSource.getRepository(
    BalanceUpdateQueueEntity,
);
export const logRepository = typeOrmDataSource.getRepository(LogEntity);
export const orderRepository = typeOrmDataSource.getRepository(OrderEntity);
export const handlerPortRepository =
    typeOrmDataSource.getRepository(HandlerPortEntity);
export const recurrentPaymentsQueueRepository = typeOrmDataSource.getRepository(
    RecurrentPaymentsQueueEntity,
);
export const encryptedStorageRepository = typeOrmDataSource.getRepository(
    EncryptedStorageEntity,
);
