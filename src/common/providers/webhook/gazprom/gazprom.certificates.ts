import { encryptedStorageRepository } from 'src/database/repositories';
import { Dictionary } from 'src/common/types/general';
import { Encryption } from '../../encryption';

export class GazpromCertificates {
    private static content: Dictionary = {};

    /**
     * Load certificates from database
     */
    static async loadAll(): Promise<void> {
        const records = await encryptedStorageRepository
            .createQueryBuilder('es')
            .select(['es.metadata', 'es.content'])
            .where(`es.destination = 'Gazprom'`)
            .getMany();

        const encryptionProvider = new Encryption();

        for (const record of records) {
            const { metadata, content: encryptedContent } = record;
            const merchId = metadata['merch_id'];
            const decryptedContent =
                encryptionProvider.aes256DecryptData(encryptedContent);

            this.content[merchId] = decryptedContent;
        }
    }

    /**
     * Get certificate content by name
     */
    static getCertificateByName(merchIdCredential: string): string {
        return <string>this.content[merchIdCredential];
    }
}
