import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import RegularLogger from './common/providers/logger/regular.logger';
import helmet from '@fastify/helmet';
import fastifyCsrf from '@fastify/csrf-protection';
import config from './common/config';
import { LogLevel, LoggerService, ValidationPipe } from '@nestjs/common';
import { AppModule } from './modules/app.module';
import { typeOrmDataSource } from 'src/database/data-source';
import { GazpromCompletionWebhook } from './common/providers/webhook/gazprom/gazprom-completion.webhook';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { GeneralUtil } from './common/utils/general.util';
import { MongoClient } from './common/providers/mongoClient';
import { ServerType } from './common/enums/general';
import { handlerPortRepository } from './database/repositories';
import { HandlerPortEntity } from './database/entities/handlerPort.entity';

export class ServerBootstrap {
    private static instance: ServerBootstrap | null = null;
    private regularLogger = RegularLogger.getInstance();
    private app: NestFastifyApplication;
    private serverType: ServerType;
    private port: number;

    private constructor() {}

    /**
     * Get instance of the class
     */
    static getInstance(): ServerBootstrap {
        if (!(ServerBootstrap.instance instanceof ServerBootstrap)) {
            return (ServerBootstrap.instance = new ServerBootstrap());
        }
        return ServerBootstrap.instance;
    }

    /**
     * Start the server
     */
    async start() {
        await this.connectPostgres();
        await this.connectMongo();

        GazpromCompletionWebhook.loadCertificates();

        /**
         * Build application instance
         */
        this.app = await NestFactory.create<NestFastifyApplication>(
            AppModule,
            new FastifyAdapter(),
            {
                cors: true,
                logger: this.getNestLoggerOptions(),
            },
        );

        await this.applicationSetup();
        await this.defineServerTypeAndPort();
        await this.listen();

        this.serverShutdownHook();
    }

    /**
     * Define server type and port
     */
    private async defineServerTypeAndPort(): Promise<void> {
        /**
         * Server started as 'Primary'
         */
        if (config.server.isPrimary()) {
            this.port = config.server.port.primary;
            this.serverType = ServerType.Primary;
        } else if (config.server.isExternalInteraction()) {
            /**
             * Server started as 'External interaction'
             */
            this.port = config.server.port.externalInteraction;
            this.serverType = ServerType.ExternalInteraction;
        } else {
            /**
             * If server started as 'Handler'
             */
            const leastPort = config.server.port.handler;
            for (let index = 0; index < 10; index++) {
                const port = leastPort + index;
                const isPortInUse = await GeneralUtil.isPortInUse(port);

                if (!isPortInUse) {
                    await this.insertHandlerPortInPostgres(port);
                    this.port = port;
                    break;
                }
            }
            if (!Number.isInteger(this.port)) {
                this.regularLogger.log(
                    `Server cannot be started since ports from ${leastPort} to ${leastPort + 10} are already in use`,
                );
                process.exit(1);
            }
            this.serverType = ServerType.Handler;
        }
    }

    /**
     * Start listening
     */
    private async listen() {
        await this.app.listen(this.port);
        this.regularLogger.log(
            `Server started at port ${this.port} as '${this.serverType}'`,
        );
    }

    /**
     * Assembling application
     */
    private async applicationSetup(): Promise<void> {
        const { app } = this;

        await app.register(helmet);
        await app.register(fastifyCsrf);

        app.enableShutdownHooks();
        app.useGlobalFilters(new GlobalExceptionFilter());
        app.useGlobalPipes(new ValidationPipe());
    }

    /**
     * Establish Postgres connection
     */
    private async connectPostgres(): Promise<void> {
        try {
            await typeOrmDataSource.initialize();
        } catch (postgresConnectionError) {
            this.regularLogger.error(
                postgresConnectionError,
                'Cannot connect to Postgres',
            );
            process.exit(1);
        }
        this.regularLogger.log('Postgres connected');
    }

    /**
     * Establish Mongo connection
     */
    private async connectMongo(): Promise<void> {
        try {
            await MongoClient.getInstance().connect();
        } catch (mongoConnectionError) {
            this.regularLogger.error(
                mongoConnectionError,
                'Cannot connect to Mongo',
            );
            process.exit(1);
        }
        this.regularLogger.log('Mongo connected');
    }

    /**
     * Get Nest logger options
     */
    private getNestLoggerOptions(): LoggerService | LogLevel[] {
        return config.environment.isProd()
            ? this.regularLogger
            : ['warn', 'error', 'verbose'];
    }

    /**
     * Insert port of running server handler in Postgres
     */
    private async insertHandlerPortInPostgres(port: number): Promise<void> {
        const handlerPortInstance = await handlerPortRepository
            .createQueryBuilder('hp')
            .where('hp.value = :port', { port })
            .getOne();

        if (!(handlerPortInstance instanceof HandlerPortEntity)) {
            await handlerPortRepository
                .createQueryBuilder()
                .insert()
                .values({
                    value: port,
                })
                .execute();
        }
    }

    /**
     * Method to be executed when the server stopped
     */
    async destroy(): Promise<void> {
        await handlerPortRepository
            .createQueryBuilder()
            .delete()
            .where('value = :port', { port: this.port })
            .execute();
    }

    /**
     * Handle the event of app being terminated
     */
    private serverShutdownHook() {
        process.on('SIGINT', () => {
            this.regularLogger.log('Server forcibly stopped');
        });
    }
}
