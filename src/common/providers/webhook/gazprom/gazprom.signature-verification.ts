import * as crypto from 'node:crypto';
import DatabaseLogger from '../../logger/database.logger';
import { strictEqual } from 'node:assert';
import { BadRequestException } from '@nestjs/common';
import { incomingRequestRepository } from 'src/database/repositories';
import {
    DatabaseLogType,
    IncomingRequestStatus,
} from 'src/common/enums/general';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import RegularLogger from '../../logger/regular.logger';

export class GazpromSignatureVerification {
    private static databaseLogger = DatabaseLogger.getInstance();
    private static regularLogger = RegularLogger.getInstance();

    constructor(
        private readonly incomingRequest: IncomingRequestEntity,
        private readonly certificateContent: string,
    ) {}

    /**
     * Verification process
     */
    async verify(): Promise<void> {
        try {
            const isSignatureCorrect = this.isSignatureCorrect();
            strictEqual(isSignatureCorrect, true);
        } catch (error) {
            GazpromSignatureVerification.regularLogger.error(error);
            await this.claimSignatureIncorrectness();
        }
    }

    /**
     * Check signature correctness
     */
    isSignatureCorrect(): boolean {
        const decodedSignature = this.incomingRequest.payload['signature'];
        const fullUrl = this.incomingRequest.metadata['fullUrl'];
        const [shortenUrl] = fullUrl.split('&signature=');

        const publicKey = crypto
            .createPublicKey({ key: this.certificateContent })
            .export({ type: 'spki', format: 'pem' });

        return crypto
            .createVerify('RSA-SHA1')
            .update(shortenUrl)
            .verify(publicKey, decodedSignature, 'base64');
    }

    /**
     * Claim signature incorrectness and throw an error
     */
    async claimSignatureIncorrectness(): Promise<never> {
        const incomingRequestId = this.incomingRequest.id;
        await incomingRequestRepository
            .createQueryBuilder()
            .update()
            .set({
                status: IncomingRequestStatus.Failed,
            })
            .where('id = :id', { id: incomingRequestId })
            .execute();

        await GazpromSignatureVerification.databaseLogger.write(
            DatabaseLogType.GazpromSignatureIsIncorrect,
            {
                incomingRequestId,
            },
        );
        throw new BadRequestException('Gazprom signature is incorrect');
    }
}
