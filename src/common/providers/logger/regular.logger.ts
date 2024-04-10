import { LoggerService } from '@nestjs/common';
import { pino as getPino } from 'pino';

const pino = getPino({});

export default class RegularLogger implements LoggerService {
    private static instance: RegularLogger | null = null;
    private constructor() {}

    /**
     * Get instance of the class
     */
    static getInstance(): RegularLogger {
        if (!(RegularLogger.instance instanceof RegularLogger)) {
            return (RegularLogger.instance = new RegularLogger());
        }
        return RegularLogger.instance;
    }

    /**
     * Write a 'log' level log.
     */
    log(message: any) {
        pino.info(message);
    }

    /**
     * Write an 'error' level log.
     */
    error(errorInstance: unknown, message?: string) {
        if (typeof message === 'string') {
            pino.error(message);
        }
        pino.error(errorInstance);
    }

    /**
     * Write a 'warn' level log.
     */
    warn(message: any) {
        pino.warn(message);
    }

    /**
     * Write a 'debug' level log.
     */
    debug(message: any) {
        pino.debug(message);
    }
}
