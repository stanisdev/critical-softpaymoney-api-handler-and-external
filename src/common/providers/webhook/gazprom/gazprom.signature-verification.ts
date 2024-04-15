import crypto from 'node:crypto';
import DatabaseLogger from '../../logger/database.logger';
import { strictEqual } from 'node:assert';
import { BadRequestException } from '@nestjs/common';
import { incomingRequestRepository } from 'src/database/repositories';
import {
    DatabaseLogType,
    IncomingRequestStatus,
} from 'src/common/enums/general';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';

export class GazpromSignatureVerification {
    private static databaseLogger = DatabaseLogger.getInstance();

    constructor(
        private readonly incomingRequest: IncomingRequestEntity,
        private readonly url: string,
        private readonly signature: string,
        private readonly certificateContent: string,
    ) {}

    async verify() {
        try {
            const isSignatureCorrect = this.isSignatureCorrect();
            strictEqual(isSignatureCorrect, true);
        } catch {
            await this.claimSignatureIncorrectness();
        }
    }

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
        throw new BadRequestException('Signature is incorrect');
    }

    isSignatureCorrect(): boolean {
        const decodedSignature = decodeURIComponent(this.signature);

        const publicKey = crypto
            .createPublicKey({ key: this.certificateContent })
            .export({ type: 'spki', format: 'pem' });

        return crypto
            .createVerify('RSA-SHA1')
            .update(this.url)
            .verify(publicKey, decodedSignature, 'base64');
    }
}
