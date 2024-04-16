import { Module, OnModuleDestroy } from '@nestjs/common';
import { typeOrmDataSource } from 'src/database/data-source';
import { HandlerModule } from './handler/handler.module';
import { ExternalInteractionModule } from './external-interaction/external-interaction.module';
import { MongoClient } from 'src/common/providers/mongoClient';
import { ServerBootstrap } from 'src/serverBootstrap';
import RegularLogger from 'src/common/providers/logger/regular.logger';

@Module({
    imports: [...AppModule.getModules()],
})
export class AppModule implements OnModuleDestroy {
    private regularLogger = RegularLogger.getInstance();

    async onModuleDestroy() {
        await ServerBootstrap.getInstance().destroy();
        await typeOrmDataSource.destroy();
        await MongoClient.getInstance().closeConnection();
        this.regularLogger.log('All connections closed');
    }

    /**
     * Get list of modules needed to be loaded
     */
    static getModules() {
        const serveModuleParam = process.env.SERVER_TYPE;
        const modules: (typeof HandlerModule)[] = [];

        /**
         * Handler server
         */
        if (serveModuleParam === 'handler') {
            modules.push(HandlerModule);
            /**
             * External interactio server
             */
        } else if (serveModuleParam === 'externalInteraction') {
            modules.push(ExternalInteractionModule);
            /**
             * All servers at once
             */
        } else if (serveModuleParam === 'all') {
            modules.push(HandlerModule, ExternalInteractionModule);
        } else {
            throw new Error(
                `Server started with lack of 'SERVER_TYPE' variable`,
            );
        }
        return modules;
    }
}
