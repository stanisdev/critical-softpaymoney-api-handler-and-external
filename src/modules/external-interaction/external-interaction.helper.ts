import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseLogType } from 'src/common/enums/general';
import DatabaseLogger from 'src/common/providers/logger/database.logger';
import { ExternalInteractionPayload } from 'src/common/types/general';

@Injectable()
export class ExternalInteractionHelper {
    private databaseLogger = DatabaseLogger.getInstance();

    /**
     * Parse raw, 'stringified' payload
     */
    parseCompressedPayload(
        compressedPayload: string,
    ): ExternalInteractionPayload {
        let result: ExternalInteractionPayload;
        try {
            result = JSON.parse(compressedPayload);
        } catch {
            this.databaseLogger.write(
                DatabaseLogType.CannotParseExternalInteractionPayload,
                {
                    payload: compressedPayload,
                },
            );
            throw new InternalServerErrorException(
                'Cannot parse external interaction payload',
            );
        }
        return result;
    }
}
