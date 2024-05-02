import { join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import RegularLogger from '../../logger/regular.logger';
import config from 'src/common/config';

export class GazpromCertificates {
    private static regularLogger = RegularLogger.getInstance();

    private static certificateToName = {
        /**
         * field name includes 'merch_id' value - one of the Gazprom credentials
         */
        ['gazprom-A471B6C085183B83C051']:
            'gazprom-test-merch-id-A471B6C085183B83C051.cer',
    };

    private static certificatesContent = {
        ['gazprom-A471B6C085183B83C051']: '',
    };

    /**
     * Load certificates from files and fill the 'certificatesContent' variable
     */
    static loadAll(): void {
        Object.entries(this.certificateToName).forEach(
            ([certificateName, fileName]) => {
                const filePath = join(config.dirs.certificates, fileName);
                this.certificatesContent[certificateName] =
                    this.loadCertificateFromFile(filePath);
            },
        );
    }

    /**
     * Get certificate content by name
     */
    static getCertificateByName(merchIdCredential: string): string {
        return this.certificatesContent[`gazprom-${merchIdCredential}`];
    }

    /**
     * Load certificate from file
     */
    private static loadCertificateFromFile(filePath: string): string {
        try {
            statSync(filePath);
        } catch {
            this.regularLogger.error(`Cannot read certificate: ${filePath}`);
            process.exit(1);
        }
        return readFileSync(filePath, { encoding: 'utf-8' });
    }
}
