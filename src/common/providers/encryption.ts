import * as crypto from 'node:crypto';
import config from '../../common/config';

const secretKey = config.secret.aes256.key;
const secretIv = config.secret.aes256.initializationVector;

export class Encryption {
    private initializationVector: string;
    private key: string;

    constructor() {
        /**
         * Generate secret hash with crypto to use for encryption
         */
        this.key = crypto
            .createHash('sha512')
            .update(secretKey)
            .digest('hex')
            .substring(0, 32);
        this.initializationVector = crypto
            .createHash('sha512')
            .update(secretIv)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Encrypt data with AES256 method
     */
    aes256EncryptData(dataToEncrypt: string): string {
        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            this.key,
            this.initializationVector,
        );
        const updatedCipher =
            cipher.update(dataToEncrypt, 'utf8', 'hex') + cipher.final('hex');

        return Buffer.from(updatedCipher).toString('base64');
    }

    /**
     * Decrypt data with AES256 method
     */
    aes256DecryptData(encryptedData: string): string {
        const buff = Buffer.from(encryptedData, 'base64');

        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            this.key,
            this.initializationVector,
        );
        const result =
            decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
            decipher.final('utf8');
        return result;
    }
}
