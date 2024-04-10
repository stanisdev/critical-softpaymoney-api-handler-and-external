export enum AtolRequestMethod {
    GetToken = 'getToken',
    Report = 'report',
}

export enum PaymentInfo {
    Sno = 'usn_income_outcome',
    PaymentMethod = 'full_payment',
    Quantity = 1,
    Measure = 0,
    PaymentObject = 'service', //
    PaymentsType = 1,
    VatType = 'none',
}

// eslint-disable-line no-use-before-define
export enum StatusReceipt {
    DONE = 'done', // готово;
    FAIL = 'fail', // ошибка;
    WAIT = 'wait', // ожидание;
}
