import { APP_GUARD } from '@nestjs/core';
import { Module, OnModuleDestroy } from '@nestjs/common';
import { PrimaryModule } from './primary/primary.module';
import { typeOrmDataSource } from 'src/database/data-source';
import { HandlerModule } from './handler/handler.module';
import { ExternalInteractionModule } from './external-interaction/external-interaction.module';
import { MongoClient } from 'src/common/providers/mongoClient';
import { ServerBootstrap } from 'src/serverBootstrap';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import RegularLogger from 'src/common/providers/logger/regular.logger';
import config from 'src/common/config';

@Module({
    imports: [
        ThrottlerModule.forRoot([
            {
                ttl: config.rateLimiter.restrictionPeriod,
                limit: config.rateLimiter.maxRequests,
            },
        ]),
        ...AppModule.getModules(),
    ],
    /**
     * Global rate limiter
     */
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
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
        const modules: (typeof PrimaryModule)[] = [];

        /**
         * Primary server
         */
        if (serveModuleParam === 'primary') {
            modules.push(PrimaryModule);
            /**
             * Handler server
             */
        } else if (serveModuleParam === 'handler') {
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
            modules.push(
                PrimaryModule,
                HandlerModule,
                ExternalInteractionModule,
            );
        } else {
            throw new Error(
                `Server started with lack of 'SERVER_TYPE' variable`,
            );
        }
        return modules;
    }
}
