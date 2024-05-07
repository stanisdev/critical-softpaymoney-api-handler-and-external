import * as moment from 'moment';

export class DateUtil {
    static getFullDate(): string {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }
}
