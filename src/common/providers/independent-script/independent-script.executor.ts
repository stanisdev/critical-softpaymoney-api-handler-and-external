import { RecurrentPaymentsExecutor } from '../../scripts/recurrent-payments-executor';
import { connectExternalDataStorages } from './independent-script.connections';

async function execute(): Promise<void> {
    await connectExternalDataStorages();

    if (process.env.SCRIPT_NAME === 'recurrent-payments-executor') {
        await new RecurrentPaymentsExecutor().execute();
    }
}

execute();
