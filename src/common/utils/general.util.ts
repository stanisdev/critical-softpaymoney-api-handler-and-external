import * as detectPort from 'detect-port';
import { createHash } from 'node:crypto';

export class GeneralUtil {
    static async isPortInUse(portToCheck: number): Promise<boolean> {
        const availablePort = await detectPort(portToCheck);
        return availablePort !== portToCheck;
    }

    static generateSha256Hash(content: string): string {
        return createHash('sha256').update(content).digest('hex');
    }
}
