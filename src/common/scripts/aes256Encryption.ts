import { strictEqual } from 'node:assert';
import { Encryption } from '../providers/encryption';

const initialValue = 'One, two, three, four, five';

const encryption = new Encryption();

const encryptedValue = encryption.aes256EncryptData(initialValue);
const decryptedValue = encryption.aes256DecryptData(encryptedValue);

strictEqual(initialValue, decryptedValue);
