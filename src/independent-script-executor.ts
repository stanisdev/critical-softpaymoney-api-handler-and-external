import { RecurrentPaymentsExecutor } from './common/scripts/recurrent-payments-executor';

export class IndependentScriptExecutor {
    async execute(): Promise<void> {
        /**
         * @todo: refactor this way of getting classes
         */
        if (process.env.SCRIPT_NAME === 'recurrent-payments-executor') {
            await new RecurrentPaymentsExecutor().execute();
        }
    }
}
