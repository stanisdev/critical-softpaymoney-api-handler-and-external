import { join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import RegularLogger from '../../logger/regular.logger';
import config from 'src/common/config';

export class GazpromCertificates {
    private static regularLogger = RegularLogger.getInstance();

    private static certificateToName = {
        /**
         * todo: if it is possible move to the config
         */
        test: 'gazprom-test.cer',
    };

    static certificatesContent = {
        test: '',
    };

    /**
     * Load certificates from files
     *
     * @notice: this method should be edited to get various certificates
     */
    static loadAll(): void {
        const filePath = join(
            config.dirs.certificates,
            this.certificateToName.test,
        );
        this.certificatesContent.test = this.loadCertificateFromFile(filePath);
    }

    /**
     * Get certificate content by name
     */
    static getCertificateByName(certificateName: string): string {
        return this.certificatesContent[certificateName];
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
