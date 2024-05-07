import RegularLogger from './logger/regular.logger';
import config from '../config';
import { strictEqual } from 'node:assert';
import { Client } from '@opensearch-project/opensearch';
import { HttpStatus } from '@nestjs/common';
import { Dictionary } from '../types/general';

export class OpenSearchClient {
    private static client: Client;
    private static regularLogger = RegularLogger.getInstance();

    /**
     * Build a client
     */
    static build(): void {
        this.client = new Client({
            ssl: {
                rejectUnauthorized: false,
            },
            node: config.openSearch.node,
            auth: {
                username: config.openSearch.username,
                password: config.openSearch.password,
            },
        });
    }

    /**
     * Establish a connection with OpenSearch
     */
    static async connect(): Promise<void> {
        try {
            const response = await this.client.info();
            strictEqual(response.statusCode === HttpStatus.OK, true);
        } catch (error) {
            OpenSearchClient.regularLogger.error(
                error,
                'Cannot establish a connection with OpenSearch',
            );
            process.exit(1);
        }
        this.regularLogger.log('OpenSearch connected');
    }

    /**
     * Insert a document
     */
    static async insertDocument(payload: Dictionary): Promise<void> {
        payload.date = Date.now();

        await this.client.index({
            index: config.openSearch.index,
            body: payload,
        });
    }
}
