import RegularLogger from '../logger/regular.logger';
import { RecurrentPaymentsExecutor } from '../../scripts/recurrent-payments-executor';
import { connectExternalDataStorages } from './independent-script.connections';

async function execute(): Promise<void> {
    await connectExternalDataStorages();

    const scriptName = process.env.SCRIPT_NAME;
    const regularLogger = RegularLogger.getInstance();

    regularLogger.log(`Script '${scriptName}' started`);

    if (scriptName === 'recurrent-payments-executor') {
        await new RecurrentPaymentsExecutor().execute();
    }
    regularLogger.log(`Script '${scriptName}' successfully ended its job`);
    process.exit();
}

execute();
