export class MathUtil {
    static ceil10(value: number, exp: number) {
        return this.decimalAdjust(value, exp, 'ceil');
    }

    static floor10(value: number, exp: number) {
        return this.decimalAdjust(value, exp, 'floor');
    }

    static round10(value: number, exp: number) {
        return this.decimalAdjust(value, exp, 'round');
    }

    static decimalAdjust(
        value: number | string[],
        exp: number,
        type: 'round' | 'ceil' | 'floor',
    ): number {
        if (typeof exp === 'undefined' || +exp === 0) {
            return Math[type](+value);
        }
        value = +value;
        exp = +exp;

        if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
            return NaN;
        }
        value = value.toString().split('e');
        value = Math[type](
            +(value[0] + 'e' + (value[1] ? +value[1] - exp : -exp)),
        );
        value = value.toString().split('e');

        return +(value[0] + 'e' + (value[1] ? +value[1] + exp : exp));
    }
}
