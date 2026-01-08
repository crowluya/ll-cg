export interface InitialHolding {
  code: string;
  name: string;
  quantity: number;
  cost: number;
}

export const INITIAL_CASH_AVAILABLE = 9018.7;

export const INITIAL_HOLDINGS: InitialHolding[] = [
  { code: 'sz000551', name: '创元科技', quantity: 2100, cost: 14.724 },
  { code: 'sz000816', name: '智慧农业', quantity: 1400, cost: 4.086 },
  { code: 'sz001208', name: '华菱线缆', quantity: 400, cost: 27.575 },
  { code: 'sz002151', name: '北斗星通', quantity: 200, cost: 55.809 },
  { code: 'sh603533', name: '掌阅科技', quantity: 400, cost: 21.201 },
];
